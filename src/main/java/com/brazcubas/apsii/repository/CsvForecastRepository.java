package com.brazcubas.apsii.repository;

import com.brazcubas.apsii.config.DateTimeUtils;
import com.brazcubas.apsii.model.Forecast;
import com.brazcubas.apsii.model.Probe;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Repository;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Repository
public class CsvForecastRepository implements ForecastRepository {
    private static final Logger logger = LoggerFactory.getLogger(CsvForecastRepository.class);
    private static final List<String> REQUIRED_COLUMNS = List.of(
            "prediction_id", "model_id", "model_version", "probe_id", "measurement_id",
            "country_code", "asn_v4", "asn_v6", "latitude", "longitude",
            "prediction_generated_at", "prediction_for", "predicted_avg_rtt_ms",
            "predicted_packet_loss_pct", "model_confidence");
    private static final Set<String> FORBIDDEN_COLUMNS = Set.of(
            "src_addr", "from", "address_v4", "address_v6", "prefix_v4", "prefix_v6");

    private final Resource resource;
    private final ModelRepository modelRepository;
    private List<Forecast> forecasts = List.of();
    private Map<ProbeKey, List<Forecast>> byModelAndProbe = Map.of();
    private List<Probe> probes = List.of();
    private Map<String, List<Probe>> probesByModel = Map.of();

    public CsvForecastRepository(
            ResourceLoader resourceLoader,
            ModelRepository modelRepository,
            @Value("${api.predictions-file:classpath:data/predictions.csv}") String predictionsFile) {
        this.resource = resourceLoader.getResource(predictionsFile);
        this.modelRepository = modelRepository;
    }

    @PostConstruct
    public void load() {
        if (!resource.exists()) {
            throw new IllegalStateException("The prediction dataset file was not found.");
        }
        Set<String> knownModels = new HashSet<>();
        modelRepository.findAll().forEach(model -> knownModels.add(model.id()));
        List<Forecast> loaded = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                throw new IllegalStateException("The prediction dataset has no header row.");
            }
            List<String> headers = parseCsvLine(headerLine.replace("\uFEFF", ""))
                    .stream().map(String::trim).toList();
            validateHeader(headers);
            String line;
            int rowNumber = 1;
            int skippedUnknownModels = 0;
            while ((line = reader.readLine()) != null) {
                rowNumber++;
                if (line.isBlank()) {
                    continue;
                }
                try {
                    Forecast forecast = parseRow(headers, parseCsvLine(line));
                    if (!knownModels.contains(forecast.modelId())) {
                        skippedUnknownModels++;
                        logger.warn("Skipping prediction {} with unregistered model_id {}",
                                forecast.predictionId(), forecast.modelId());
                        continue;
                    }
                    loaded.add(forecast);
                } catch (RuntimeException exception) {
                    logger.warn("Skipping invalid prediction row {}: {}", rowNumber, exception.getMessage());
                }
            }
            if (skippedUnknownModels > 0) {
                logger.warn("Ignored {} prediction rows with unregistered model_id values", skippedUnknownModels);
            }
        } catch (IOException exception) {
            throw new IllegalStateException("The prediction dataset could not be read.", exception);
        }
        if (loaded.isEmpty()) {
            throw new IllegalStateException("The prediction dataset is empty.");
        }
        Map<ProbeKey, List<Forecast>> timelines = new HashMap<>();
        Map<Integer, Probe> allProbes = new LinkedHashMap<>();
        Map<String, Map<Integer, Probe>> modelProbes = new HashMap<>();
        for (Forecast forecast : loaded) {
            ProbeKey key = new ProbeKey(forecast.modelId(), forecast.probeId());
            timelines.computeIfAbsent(key, ignored -> new ArrayList<>()).add(forecast);
            Probe probe = new Probe(forecast.probeId(), forecast.countryCode(), forecast.asnV4(), forecast.asnV6(),
                    forecast.latitude(), forecast.longitude());
            allProbes.put(probe.probeId(), probe);
            modelProbes.computeIfAbsent(forecast.modelId(), ignored -> new LinkedHashMap<>())
                    .put(probe.probeId(), probe);
        }
        Map<ProbeKey, List<Forecast>> immutableTimelines = new HashMap<>();
        timelines.forEach((key, value) -> {
            value.sort(Comparator.comparing(Forecast::predictionFor));
            immutableTimelines.put(key, List.copyOf(value));
        });
        Map<String, List<Probe>> immutableModelProbes = new HashMap<>();
        modelProbes.forEach((modelId, values) -> immutableModelProbes.put(modelId, List.copyOf(values.values())));
        forecasts = List.copyOf(loaded);
        byModelAndProbe = Map.copyOf(immutableTimelines);
        probes = List.copyOf(allProbes.values());
        probesByModel = Map.copyOf(immutableModelProbes);
        logger.info("Loaded {} predictions for {} probes", forecasts.size(), probes.size());
    }

    @Override
    public List<Forecast> findAll() {
        return forecasts;
    }

    @Override
    public List<Forecast> findByModelAndProbe(String modelId, int probeId) {
        return byModelAndProbe.getOrDefault(new ProbeKey(modelId, probeId), List.of());
    }

    @Override
    public List<Probe> listProbeLocations() {
        return probes;
    }

    @Override
    public List<Probe> listProbeLocations(String modelId) {
        return probesByModel.getOrDefault(modelId, List.of());
    }

    private static void validateHeader(List<String> headers) {
        List<String> missing = REQUIRED_COLUMNS.stream().filter(column -> !headers.contains(column)).toList();
        if (!missing.isEmpty()) {
            throw new IllegalStateException("The prediction dataset is missing required columns: "
                    + String.join(", ", missing) + ".");
        }
        List<String> forbidden = headers.stream().filter(FORBIDDEN_COLUMNS::contains).toList();
        if (!forbidden.isEmpty()) {
            throw new IllegalStateException("The prediction dataset contains probe address fields that must not be exposed.");
        }
    }

    private static Forecast parseRow(List<String> headers, List<String> values) {
        if (headers.size() != values.size()) {
            throw new IllegalArgumentException("column count does not match header");
        }
        Map<String, String> row = new HashMap<>();
        for (int index = 0; index < headers.size(); index++) {
            row.put(headers.get(index), values.get(index).trim());
        }
        double latitude = parseDouble(row, "latitude");
        double longitude = parseDouble(row, "longitude");
        double rtt = parseDouble(row, "predicted_avg_rtt_ms");
        double loss = parseDouble(row, "predicted_packet_loss_pct");
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("coordinates are out of range");
        }
        if (rtt < 0 || loss < 0) {
            throw new IllegalArgumentException("predicted metrics must be non-negative");
        }
        String confidenceValue = row.get("model_confidence");
        Double confidence = confidenceValue == null || confidenceValue.isBlank()
                ? null
                : Double.valueOf(confidenceValue);
        if (confidence != null && (!Double.isFinite(confidence) || confidence < 0 || confidence > 1)) {
            throw new IllegalArgumentException("model_confidence must be between 0 and 1");
        }
        return new Forecast(
                required(row, "prediction_id"),
                required(row, "model_id"),
                required(row, "model_version"),
                Integer.parseInt(required(row, "probe_id")),
                Long.parseLong(required(row, "measurement_id")),
                required(row, "country_code").toUpperCase(Locale.ROOT),
                optionalInteger(row.get("asn_v4")),
                optionalInteger(row.get("asn_v6")),
                latitude,
                longitude,
                DateTimeUtils.parseUtc(required(row, "prediction_generated_at")),
                DateTimeUtils.parseUtc(required(row, "prediction_for")),
                rtt,
                loss,
                confidence);
    }

    private static double parseDouble(Map<String, String> row, String field) {
        double value = Double.parseDouble(required(row, field));
        if (!Double.isFinite(value)) {
            throw new IllegalArgumentException(field + " must be finite");
        }
        return value;
    }

    private static String required(Map<String, String> row, String field) {
        String value = row.get(field);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("missing " + field);
        }
        return value.trim();
    }

    private static Integer optionalInteger(String value) {
        return value == null || value.isBlank() ? null : Integer.valueOf(value);
    }

    private static List<String> parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder value = new StringBuilder();
        boolean quoted = false;
        for (int index = 0; index < line.length(); index++) {
            char character = line.charAt(index);
            if (character == '"') {
                if (quoted && index + 1 < line.length() && line.charAt(index + 1) == '"') {
                    value.append('"');
                    index++;
                } else {
                    quoted = !quoted;
                }
            } else if (character == ',' && !quoted) {
                fields.add(value.toString());
                value.setLength(0);
            } else {
                value.append(character);
            }
        }
        if (quoted) {
            throw new IllegalArgumentException("unterminated quoted CSV field");
        }
        fields.add(value.toString());
        return fields;
    }

    private record ProbeKey(String modelId, int probeId) {}
}
