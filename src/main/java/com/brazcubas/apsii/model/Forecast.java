package com.brazcubas.apsii.model;

import java.time.Instant;

/**
 * Previsão de qualidade de conexão para uma probe e modelo.
 */
public record Forecast(
        String predictionId,
        String modelId,
        String modelVersion,
        int probeId,
        long measurementId,
        String countryCode,
        Integer asnV4,
        Integer asnV6,
        double latitude,
        double longitude,
        Instant predictionGeneratedAt,
        Instant predictionFor,
        double predictedAvgRttMs,
        double predictedPacketLossPct,
        Double modelConfidence) {
}
