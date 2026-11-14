package com.brazcubas.apsii.service;

import com.brazcubas.apsii.config.ActivityRules;
import com.brazcubas.apsii.config.QualityRules.Quality;
import com.brazcubas.apsii.model.ApiDtos;
import com.brazcubas.apsii.model.LiveTelemetryDtos.LiveSyncStatusResponse;
import com.brazcubas.apsii.model.LiveTelemetryDtos.LiveTelemetryResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Serviço responsável por consultar telemetria ao vivo da API do RIPE Atlas,
 * manter cache em memória e sincronizar periodicamente em segundo plano.
 */
@Service
public class RipeAtlasLiveService {
    private static final Logger logger = LoggerFactory.getLogger(RipeAtlasLiveService.class);
    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration CACHE_TTL = Duration.ofMinutes(5);

    private static final java.util.Map<Integer, Integer> MOCK_TO_ATLAS_PROBE = java.util.Map.of(
            900001, 6410,
            900002, 6602,
            900003, 6891,
            900004, 6790,
            900005, 7307,
            900006, 7508,
            900007, 7242,
            900008, 7019,
            900009, 6349,
            900010, 7113
    );

    private final QualityClassifier classifier;
    private final RecommendationService recommendationService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    private final String baseUrl;
    private final int defaultMeasurementId;
    private final boolean liveSyncEnabled;
    private final long syncRateMs;
    private final List<Integer> monitoredProbes;

    private final ConcurrentMap<Integer, LiveTelemetryResponse> cache = new ConcurrentHashMap<>();
    private final AtomicReference<Instant> lastSyncAt = new AtomicReference<>();

    public RipeAtlasLiveService(
            QualityClassifier classifier,
            RecommendationService recommendationService,
            ObjectMapper objectMapper,
            @Value("${api.ripe-atlas.base-url:https://atlas.ripe.net/api/v2}") String baseUrl,
            @Value("${api.ripe-atlas.default-measurement-id:1001}") int defaultMeasurementId,
            @Value("${api.ripe-atlas.live-sync.enabled:true}") boolean liveSyncEnabled,
            @Value("${api.ripe-atlas.sync-rate-ms:600000}") long syncRateMs,
            @Value("${api.ripe-atlas.monitored-probes:6349,6410,6602,6659,6790,6891,6977,7019,7113,7242,7307,7508,7708,7848,11315}") String monitoredProbesStr) {
        this.classifier = classifier;
        this.recommendationService = recommendationService;
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.defaultMeasurementId = defaultMeasurementId;
        this.liveSyncEnabled = liveSyncEnabled;
        this.syncRateMs = syncRateMs;
        this.monitoredProbes = parseProbeIds(monitoredProbesStr);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(HTTP_TIMEOUT)
                .build();
    }

    /**
     * Consulta a telemetria mais recente para uma probe (retorna do cache ou consulta ao vivo).
     */
    public LiveTelemetryResponse getLiveTelemetry(int probeId) {
        int targetAtlasId = MOCK_TO_ATLAS_PROBE.getOrDefault(probeId, probeId);
        LiveTelemetryResponse cached = cache.get(targetAtlasId);
        if (cached != null && Duration.between(cached.fetchedAt(), Instant.now()).compareTo(CACHE_TTL) < 0) {
            return withProbeId(cached, probeId);
        }

        try {
            LiveTelemetryResponse fresh = fetchFromRipeAtlas(targetAtlasId, defaultMeasurementId);
            if (fresh != null) {
                cache.put(targetAtlasId, fresh);
                return withProbeId(fresh, probeId);
            }
        } catch (Exception ex) {
            logger.warn("Falha ao consultar RIPE Atlas ao vivo para probe {}: {}", targetAtlasId, ex.getMessage());
        }

        // Fallback resiliente caso a chamada falhe
        if (cached != null) {
            return new LiveTelemetryResponse(
                    probeId, cached.measurementId(), "RIPE_ATLAS_CACHE_FALLBACK",
                    cached.avgRttMs(), cached.minRttMs(), cached.maxRttMs(), cached.packetLossPct(),
                    cached.sentPackets(), cached.receivedPackets(), cached.measuredAt(), Instant.now(),
                    cached.quality(), cached.qualityScore(), cached.recommendation(), cached.recommendationMessage(),
                    "Dados retornados do cache devido à indisponibilidade temporária da API externa");
        }

        return createSimulatedFallback(probeId);
    }

    private static LiveTelemetryResponse withProbeId(LiveTelemetryResponse item, int requestedProbeId) {
        if (item.probeId() == requestedProbeId) {
            return item;
        }
        return new LiveTelemetryResponse(
                requestedProbeId, item.measurementId(), item.source(),
                item.avgRttMs(), item.minRttMs(), item.maxRttMs(), item.packetLossPct(),
                item.sentPackets(), item.receivedPackets(), item.measuredAt(), item.fetchedAt(),
                item.quality(), item.qualityScore(), item.recommendation(), item.recommendationMessage(),
                item.statusMessage());
    }

    /**
     * Retorna todas as telemetrias armazenadas no cache local.
     */
    public List<LiveTelemetryResponse> getAllCachedTelemetry() {
        return new ArrayList<>(cache.values());
    }

    /**
     * Status atual do agendador e do cache.
     */
    public LiveSyncStatusResponse getStatus() {
        return new LiveSyncStatusResponse(
                liveSyncEnabled,
                defaultMeasurementId,
                syncRateMs,
                lastSyncAt.get(),
                cache.size(),
                monitoredProbes);
    }

    /**
     * Força sincronização imediata com o RIPE Atlas para todas as probes monitoradas.
     */
    public int refreshAll() {
        if (monitoredProbes.isEmpty()) {
            return 0;
        }
        return syncBatch(monitoredProbes);
    }

    /**
     * Agendador periódico em segundo plano.
     */
    @Scheduled(fixedRateString = "${api.ripe-atlas.sync-rate-ms:600000}", initialDelay = 5000)
    public void scheduledSync() {
        if (!liveSyncEnabled) {
            logger.debug("Sincronização ao vivo do RIPE Atlas está desativada por configuração.");
            return;
        }
        try {
            logger.info("Iniciando sincronização periódica de telemetria RIPE Atlas para {} probes...", monitoredProbes.size());
            int updated = refreshAll();
            logger.info("Sincronização RIPE Atlas concluída: {} medições atualizadas em cache.", updated);
        } catch (Exception e) {
            logger.warn("Erro durante sincronização agendada RIPE Atlas: {}", e.getMessage());
        }
    }

    private LiveTelemetryResponse fetchFromRipeAtlas(int probeId, int msmId) throws Exception {
        String uri = String.format("%s/measurements/%d/latest/?probe_ids=%d", baseUrl, msmId, probeId);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(uri))
                .timeout(HTTP_TIMEOUT)
                .header("User-Agent", "ConnectTech-APSII/1.0")
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200 || response.body().isBlank()) {
            logger.warn("RIPE Atlas API retornou status {} para probe {}", response.statusCode(), probeId);
            return null;
        }

        JsonNode root = objectMapper.readTree(response.body());
        if (!root.isArray() || root.isEmpty()) {
            return null;
        }

        return parseMeasurementNode(root.get(0), "RIPE_ATLAS_LIVE");
    }

    private int syncBatch(List<Integer> probeIds) {
        if (probeIds == null || probeIds.isEmpty()) {
            return 0;
        }
        String idList = String.join(",", probeIds.stream().map(String::valueOf).toList());
        String uri = String.format("%s/measurements/%d/latest/?probe_ids=%s", baseUrl, defaultMeasurementId, idList);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(uri))
                    .timeout(HTTP_TIMEOUT.multipliedBy(2))
                    .header("User-Agent", "ConnectTech-APSII/1.0")
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200 || response.body().isBlank()) {
                logger.warn("Falha no lote RIPE Atlas: status {}", response.statusCode());
                return 0;
            }

            JsonNode root = objectMapper.readTree(response.body());
            if (!root.isArray()) {
                return 0;
            }

            int count = 0;
            for (JsonNode item : root) {
                LiveTelemetryResponse telemetry = parseMeasurementNode(item, "RIPE_ATLAS_LIVE");
                if (telemetry != null) {
                    cache.put(telemetry.probeId(), telemetry);
                    count++;
                }
            }
            lastSyncAt.set(Instant.now());
            return count;
        } catch (Exception ex) {
            logger.warn("Exceção na sincronização de lote RIPE Atlas: {}", ex.getMessage());
            return 0;
        }
    }

    private LiveTelemetryResponse parseMeasurementNode(JsonNode node, String source) {
        if (node == null) return null;

        int probeId = node.path("prb_id").asInt(0);
        int msmId = node.path("msm_id").asInt(defaultMeasurementId);
        double avgRtt = node.path("avg").asDouble(30.0);
        double minRtt = node.path("min").asDouble(avgRtt);
        double maxRtt = node.path("max").asDouble(avgRtt);
        int sent = node.path("sent").asInt(3);
        int rcvd = node.path("rcvd").asInt(3);
        long timestampSec = node.path("timestamp").asLong(Instant.now().getEpochSecond());

        double lossPct = sent > 0 ? Math.max(0.0, ((sent - rcvd) / (double) sent) * 100.0) : 0.0;
        Instant measuredAt = Instant.ofEpochSecond(timestampSec);
        Instant fetchedAt = Instant.now();

        QualityClassifier.QualityAssessment assessment = classifier.assess(avgRtt, lossPct);
        ApiDtos.Recommendation recommendation = recommendationService.forQuality(assessment.quality());

        return new LiveTelemetryResponse(
                probeId,
                msmId,
                source,
                Math.round(avgRtt * 10.0) / 10.0,
                Math.round(minRtt * 10.0) / 10.0,
                Math.round(maxRtt * 10.0) / 10.0,
                Math.round(lossPct * 10.0) / 10.0,
                sent,
                rcvd,
                measuredAt,
                fetchedAt,
                assessment.quality(),
                assessment.qualityScore(),
                recommendation.code(),
                recommendation.message(),
                "Telemetria em tempo real sincronizada diretamente da rede RIPE Atlas");
    }

    private LiveTelemetryResponse createSimulatedFallback(int probeId) {
        QualityClassifier.QualityAssessment assessment = classifier.assess(45.0, 0.0);
        ApiDtos.Recommendation rec = recommendationService.forQuality(assessment.quality());
        return new LiveTelemetryResponse(
                probeId,
                defaultMeasurementId,
                "LOCAL_FALLBACK",
                45.0, 42.0, 48.0, 0.0, 3, 3,
                Instant.now(), Instant.now(),
                assessment.quality(), assessment.qualityScore(),
                rec.code(), rec.message(),
                "Medição aproximada local (servidor RIPE Atlas inacessível ou probe não respondeu)");
    }

    private static List<Integer> parseProbeIds(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        return Arrays.stream(text.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Integer::parseInt)
                .toList();
    }
}
