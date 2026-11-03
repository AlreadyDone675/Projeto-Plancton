package com.brazcubas.apsii.service;

import com.brazcubas.apsii.config.ApiException;
import com.brazcubas.apsii.config.DateTimeUtils;
import com.brazcubas.apsii.config.QualityRules.Quality;
import com.brazcubas.apsii.model.ApiDtos;
import com.brazcubas.apsii.model.Forecast;
import com.brazcubas.apsii.model.PredictionModel;
import com.brazcubas.apsii.repository.ForecastRepository;
import org.springframework.stereotype.Service;

import java.time.DateTimeException;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ForecastService {
    private static final String NEARBY_DISCLAIMER =
            "A previsão está associada à probe RIPE Atlas selecionada como referência geográfica "
                    + "e não representa uma medição direta do dispositivo do usuário.";
    private static final String LOCATION_PRIVACY =
            "As coordenadas públicas das probes recebem proteção de privacidade do RIPE Atlas "
                    + "e não devem ser tratadas como a localização exata do usuário.";

    private final ForecastRepository repository;
    private final LocationService locationService;
    private final ModelService modelService;
    private final QualityClassifier classifier;
    private final RecommendationService recommendations;

    public ForecastService(
            ForecastRepository repository,
            LocationService locationService,
            ModelService modelService,
            QualityClassifier classifier,
            RecommendationService recommendations) {
        this.repository = repository;
        this.locationService = locationService;
        this.modelService = modelService;
        this.classifier = classifier;
        this.recommendations = recommendations;
    }

    public ApiDtos.ProbeForecastResponse getProbeForecast(int probeId, String modelId) {
        PredictionModel model = modelService.requireActive(modelId);
        Forecast forecast = selectCurrent(requireProbeRecords(model.id(), probeId));
        QualityClassifier.QualityAssessment assessment = assess(forecast);
        return new ApiDtos.ProbeForecastResponse(
                modelReference(model),
                probeId,
                new ApiDtos.LocationWithCountry(forecast.latitude(), forecast.longitude(), forecast.countryCode()),
                new ApiDtos.PredictionDetail(
                        forecast.predictionFor(), forecast.predictedAvgRttMs(),
                        forecast.predictedPacketLossPct(), forecast.modelConfidence()),
                new ApiDtos.Assessment(assessment.quality(), assessment.qualityScore()),
                recommendations.forQuality(assessment.quality()));
    }

    public ApiDtos.TimelineResponse getTimeline(
            int probeId, String modelId, String from, String to, int limit) {
        PredictionModel model = modelService.requireActive(modelId);
        Instant fromTime = parseOptionalTime(from, "from");
        Instant toTime = parseOptionalTime(to, "to");
        if (fromTime != null && toTime != null && fromTime.isAfter(toTime)) {
            throw new ApiException(
                    400,
                    "INVALID_TIME_RANGE",
                    "The 'from' timestamp must be earlier than or equal to the 'to' timestamp.");
        }
        List<Forecast> records = requireProbeRecords(model.id(), probeId).stream()
                .filter(record -> fromTime == null || !record.predictionFor().isBefore(fromTime))
                .filter(record -> toTime == null || !record.predictionFor().isAfter(toTime))
                .limit(limit)
                .toList();
        List<ApiDtos.TimelineItem> items = records.stream()
                .map(record -> {
                    QualityClassifier.QualityAssessment assessment = assess(record);
                    return new ApiDtos.TimelineItem(
                            record.predictionFor(), record.predictedAvgRttMs(), record.predictedPacketLossPct(),
                            assessment.quality(), assessment.qualityScore());
                })
                .toList();
        return new ApiDtos.TimelineResponse(modelReference(model), probeId, items);
    }

    public ApiDtos.NearbyForecastResponse getNearbyForecast(
            double latitude, double longitude, String modelId, Double radiusKm) {
        PredictionModel model = modelService.requireActive(modelId);
        LocationService.NearestProbe nearest = locationService.findNearest(latitude, longitude, radiusKm, model.id());
        Forecast forecast = selectCurrent(requireProbeRecords(model.id(), nearest.probe().probeId()));
        QualityClassifier.QualityAssessment assessment = assess(forecast);
        return new ApiDtos.NearbyForecastResponse(
                modelReference(model),
                new ApiDtos.RequestedLocation(latitude, longitude),
                new ApiDtos.MatchedProbe(nearest.probe().probeId(), nearest.distanceKm()),
                new ApiDtos.PredictionSummary(
                        forecast.predictionFor(), forecast.predictedAvgRttMs(), forecast.predictedPacketLossPct()),
                new ApiDtos.Assessment(assessment.quality(), assessment.qualityScore()),
                recommendations.forQuality(assessment.quality()),
                referenceMetadata());
    }

    public ApiDtos.CompareResponse compare(int probeId, String predictionFor) {
        List<PredictionModel> activeModels = modelService.listActiveModels();
        Map<String, List<Forecast>> timelines = new LinkedHashMap<>();
        for (PredictionModel model : activeModels) {
            List<Forecast> records = repository.findByModelAndProbe(model.id(), probeId);
            if (!records.isEmpty()) {
                timelines.put(model.id(), records);
            }
        }
        if (timelines.isEmpty()) {
            throw probeNotFound();
        }
        Set<Instant> commonTimes = new HashSet<>(timelines.values().iterator().next().stream()
                .map(Forecast::predictionFor)
                .toList());
        for (List<Forecast> timeline : timelines.values().stream().skip(1).toList()) {
            Set<Instant> times = timeline.stream().map(Forecast::predictionFor).collect(Collectors.toSet());
            commonTimes.retainAll(times);
        }
        if (commonTimes.isEmpty()) {
            throw noCommonPrediction();
        }
        Instant target = parseOptionalTime(predictionFor, "prediction_for");
        Instant chosen;
        if (target != null) {
            if (!commonTimes.contains(target)) {
                throw noCommonPrediction();
            }
            chosen = target;
        } else {
            chosen = selectCurrentTime(commonTimes);
        }
        Map<String, PredictionModel> catalog = new HashMap<>();
        activeModels.forEach(model -> catalog.put(model.id(), model));
        List<ApiDtos.CompareModelItem> items = timelines.entrySet().stream()
                .map(entry -> {
                    Forecast forecast = entry.getValue().stream()
                            .filter(record -> record.predictionFor().equals(chosen))
                            .findFirst()
                            .orElseThrow();
                    Quality quality = assess(forecast).quality();
                    PredictionModel model = catalog.get(entry.getKey());
                    return new ApiDtos.CompareModelItem(
                            model.id(), model.name(), forecast.predictedAvgRttMs(),
                            forecast.predictedPacketLossPct(), quality);
                })
                .sorted(Comparator.comparing(ApiDtos.CompareModelItem::modelName, String.CASE_INSENSITIVE_ORDER))
                .toList();
        return new ApiDtos.CompareResponse(probeId, chosen, items);
    }

    public Forecast selectClosestRecord(String modelId, int probeId, Instant target) {
        return requireProbeRecords(modelId, probeId).stream()
                .min(Comparator.comparing(record -> Duration.between(target, record.predictionFor()).abs()))
                .orElseThrow(() -> probeNotFound());
    }

    public PredictionModel requireActiveModel(String modelId) {
        return modelService.requireActive(modelId);
    }

    public ApiDtos.NearbyMetadata referenceMetadata() {
        return new ApiDtos.NearbyMetadata(NEARBY_DISCLAIMER, LOCATION_PRIVACY);
    }

    private List<Forecast> requireProbeRecords(String modelId, int probeId) {
        List<Forecast> records = repository.findByModelAndProbe(modelId, probeId);
        if (records.isEmpty()) {
            throw probeNotFound();
        }
        return records;
    }

    private QualityClassifier.QualityAssessment assess(Forecast forecast) {
        return classifier.assess(forecast.predictedAvgRttMs(), forecast.predictedPacketLossPct());
    }

    private static Forecast selectCurrent(List<Forecast> records) {
        Instant now = Instant.now();
        return records.stream()
                .filter(record -> !record.predictionFor().isBefore(now))
                .min(Comparator.comparing(Forecast::predictionFor))
                .orElseGet(() -> records.stream().max(Comparator.comparing(Forecast::predictionFor)).orElseThrow());
    }

    private static Instant selectCurrentTime(Set<Instant> times) {
        Instant now = Instant.now();
        return times.stream()
                .filter(time -> !time.isBefore(now))
                .min(Comparator.naturalOrder())
                .orElseGet(() -> times.stream().max(Comparator.naturalOrder()).orElseThrow());
    }

    private static ApiDtos.ModelReference modelReference(PredictionModel model) {
        return new ApiDtos.ModelReference(model.id(), model.name(), model.version());
    }

    private static Instant parseOptionalTime(String value, String field) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return DateTimeUtils.parseUtc(value);
        } catch (DateTimeException exception) {
            throw ApiException.validation(field, "must be an ISO-8601 timestamp");
        }
    }

    private static ApiException probeNotFound() {
        return new ApiException(404, "PROBE_NOT_FOUND", "No prediction data was found for the requested probe.");
    }

    private static ApiException noCommonPrediction() {
        return new ApiException(
                404,
                "NO_COMMON_PREDICTION",
                "No shared prediction instant was found across active models for this probe.");
    }
}
