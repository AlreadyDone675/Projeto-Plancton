package com.brazcubas.apsii.model;

import com.brazcubas.apsii.config.ActivityRules;
import com.brazcubas.apsii.config.QualityRules.Quality;

import java.time.Instant;
import java.util.List;

/**
 * DTOs para telemetria em tempo real coletada diretamente do RIPE Atlas.
 */
public final class LiveTelemetryDtos {
    private LiveTelemetryDtos() {}

    public record LiveTelemetryResponse(
            int probeId,
            int measurementId,
            String source,
            double avgRttMs,
            double minRttMs,
            double maxRttMs,
            double packetLossPct,
            int sentPackets,
            int receivedPackets,
            Instant measuredAt,
            Instant fetchedAt,
            Quality quality,
            int qualityScore,
            ActivityRules.Recommendation recommendation,
            String recommendationMessage,
            String statusMessage) {}

    public record LiveSyncStatusResponse(
            boolean liveSyncEnabled,
            int defaultMeasurementId,
            long syncRateMs,
            Instant lastSyncAt,
            int cachedProbesCount,
            List<Integer> monitoredProbes) {}

    public record RefreshResponse(
            int refreshedCount,
            Instant refreshedAt,
            String message) {}
}
