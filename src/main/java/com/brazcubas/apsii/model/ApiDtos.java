package com.brazcubas.apsii.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.brazcubas.apsii.config.ActivityRules;
import com.brazcubas.apsii.config.QualityRules.Quality;

import java.time.Instant;
import java.util.List;

public final class ApiDtos {
    private ApiDtos() {}

    public record HealthResponse(String status, String service) {}

    public record ErrorResponse(ErrorBody error) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ErrorBody(String code, String message, List<ErrorDetail> details) {}

    public record ErrorDetail(String field, String message) {}

    public record GeoPoint(double latitude, double longitude) {}

    public record LocationItem(
            int probeId,
            String countryCode,
            Integer asnV4,
            Integer asnV6,
            GeoPoint location) {}

    public record LocationsResponse(List<LocationItem> items, int total) {}

    public record ModelListItem(
            String id,
            String name,
            String description,
            String groupName,
            String algorithm,
            String version) {}

    public record ModelsResponse(List<ModelListItem> items, int total) {}

    public record ModelDetail(
            String id,
            String name,
            String description,
            String groupName,
            String algorithm,
            String version,
            boolean active) {}

    public record ModelReference(String id, String name, String version) {}

    public record LocationWithCountry(double latitude, double longitude, String countryCode) {}

    public record PredictionDetail(
            Instant predictionFor,
            double predictedAvgRttMs,
            double predictedPacketLossPct,
            Double modelConfidence) {}

    public record PredictionSummary(
            Instant predictionFor,
            double predictedAvgRttMs,
            double predictedPacketLossPct) {}

    public record TimelineItem(
            Instant predictionFor,
            double predictedAvgRttMs,
            double predictedPacketLossPct,
            Quality quality,
            int qualityScore) {}

    public record Assessment(Quality quality, int qualityScore) {}

    public record Recommendation(ActivityRules.Recommendation code, String message) {}

    public record ProbeForecastResponse(
            ModelReference model,
            int probeId,
            LocationWithCountry location,
            PredictionDetail prediction,
            Assessment assessment,
            Recommendation recommendation) {}

    public record TimelineResponse(ModelReference model, int probeId, List<TimelineItem> items) {}

    public record RequestedLocation(double latitude, double longitude) {}

    public record MatchedProbe(int probeId, double distanceKm) {}

    public record NearbyMetadata(String disclaimer, String locationPrivacy) {}

    public record NearbyForecastResponse(
            ModelReference model,
            RequestedLocation requestedLocation,
            MatchedProbe matchedProbe,
            PredictionSummary prediction,
            Assessment assessment,
            Recommendation recommendation,
            NearbyMetadata metadata) {}

    public record ActivityForecast(
            Quality quality,
            double predictedAvgRttMs,
            double predictedPacketLossPct) {}

    public record CompareModelItem(
            String modelId,
            String modelName,
            double predictedAvgRttMs,
            double predictedPacketLossPct,
            Quality quality) {}

    public record CompareResponse(int probeId, Instant predictionFor, List<CompareModelItem> models) {}
}
