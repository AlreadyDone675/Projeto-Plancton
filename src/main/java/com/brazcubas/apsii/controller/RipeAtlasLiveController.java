package com.brazcubas.apsii.controller;

import com.brazcubas.apsii.model.LiveTelemetryDtos.LiveSyncStatusResponse;
import com.brazcubas.apsii.model.LiveTelemetryDtos.LiveTelemetryResponse;
import com.brazcubas.apsii.model.LiveTelemetryDtos.RefreshResponse;
import com.brazcubas.apsii.service.RipeAtlasLiveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/**
 * Controller REST para consulta e sincronização em tempo real com a API do RIPE Atlas.
 */
@RestController
@RequestMapping("/api/v1/live")
@Validated
@Tag(name = "Live RIPE Atlas Telemetry", description = "Monitoramento e telemetria em tempo real diretamente da rede RIPE Atlas")
public class RipeAtlasLiveController {
    private final RipeAtlasLiveService liveService;

    public RipeAtlasLiveController(RipeAtlasLiveService liveService) {
        this.liveService = liveService;
    }

    @Operation(summary = "Consultar telemetria em tempo real de uma probe RIPE Atlas")
    @GetMapping("/probes/{probe_id}")
    public LiveTelemetryResponse getLiveTelemetry(
            @PathVariable("probe_id") @Min(1) int probeId) {
        return liveService.getLiveTelemetry(probeId);
    }

    @Operation(summary = "Listar telemetria em tempo real de todas as probes monitoradas em cache")
    @GetMapping("/probes")
    public List<LiveTelemetryResponse> getAllCachedProbes() {
        return liveService.getAllCachedTelemetry();
    }

    @Operation(summary = "Consultar status do serviço de sincronização periódica com a RIPE Atlas")
    @GetMapping("/status")
    public LiveSyncStatusResponse getStatus() {
        return liveService.getStatus();
    }

    @Operation(summary = "Forçar atualização imediata do cache consultando a API da RIPE Atlas")
    @PostMapping("/refresh")
    public RefreshResponse refreshNow() {
        int updated = liveService.refreshAll();
        return new RefreshResponse(
                updated,
                Instant.now(),
                String.format("Atualização concluída com sucesso para %d probes monitoradas.", updated));
    }
}
