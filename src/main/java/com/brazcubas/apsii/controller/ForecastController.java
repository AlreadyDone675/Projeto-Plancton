package com.brazcubas.apsii.controller;

import com.brazcubas.apsii.config.ApiException;
import com.brazcubas.apsii.model.ApiDtos;
import com.brazcubas.apsii.service.ForecastService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/forecasts")
@Validated
@Tag(name = "Forecasts")
public class ForecastController {
    private final ForecastService forecastService;
    private final int timelineDefaultLimit;
    private final int timelineMaxLimit;

    public ForecastController(
            ForecastService forecastService,
            @Value("${api.timeline-default-limit:24}") int timelineDefaultLimit,
            @Value("${api.timeline-max-limit:100}") int timelineMaxLimit) {
        this.forecastService = forecastService;
        if (timelineDefaultLimit < 1 || timelineDefaultLimit > timelineMaxLimit) {
            throw new IllegalArgumentException("Timeline limits must satisfy 1 <= default <= maximum");
        }
        this.timelineDefaultLimit = timelineDefaultLimit;
        this.timelineMaxLimit = timelineMaxLimit;
    }

    @Operation(summary = "Get probe forecast")
    @GetMapping("/probes/{probe_id}")
    public ApiDtos.ProbeForecastResponse getProbeForecast(
            @PathVariable("probe_id") @Min(1) int probeId,
            @RequestParam("model_id") @NotBlank String modelId) {
        return forecastService.getProbeForecast(probeId, modelId);
    }

    @Operation(summary = "Get forecast timeline")
    @GetMapping("/probes/{probe_id}/timeline")
    public ApiDtos.TimelineResponse getTimeline(
            @PathVariable("probe_id") @Min(1) int probeId,
            @RequestParam("model_id") @NotBlank String modelId,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            @RequestParam(name = "limit", required = false) Integer limit) {
        int effectiveLimit = limit == null ? timelineDefaultLimit : limit;
        if (effectiveLimit < 1 || effectiveLimit > timelineMaxLimit) {
            throw ApiException.validation("limit", "must be between 1 and " + timelineMaxLimit);
        }
        return forecastService.getTimeline(probeId, modelId, from, to, effectiveLimit);
    }

    @Operation(summary = "Compare model forecasts")
    @GetMapping("/probes/{probe_id}/compare")
    public ApiDtos.CompareResponse compare(
            @PathVariable("probe_id") @Min(1) int probeId,
            @RequestParam(name = "prediction_for", required = false) String predictionFor) {
        return forecastService.compare(probeId, predictionFor);
    }

    @Operation(summary = "Get nearby forecast")
    @GetMapping("/nearby")
    public ApiDtos.NearbyForecastResponse getNearbyForecast(
            @RequestParam("lat") @DecimalMin("-90.0") @DecimalMax("90.0") double latitude,
            @RequestParam("lon") @DecimalMin("-180.0") @DecimalMax("180.0") double longitude,
            @RequestParam("model_id") @NotBlank String modelId,
            @RequestParam(name = "radius_km", required = false) @DecimalMin(value = "0.0", inclusive = false) Double radiusKm) {
        return forecastService.getNearbyForecast(latitude, longitude, modelId, radiusKm);
    }
}
