package com.brazcubas.apsii.controller;

import com.brazcubas.apsii.model.ApiDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint de saúde da API.
 */
@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health")
public class HealthController {
    private final String serviceName;

    public HealthController(@Value("${api.service-name:internet-quality-api}") String serviceName) {
        this.serviceName = serviceName;
    }

    @Operation(summary = "Health check")
    @GetMapping
    public ApiDtos.HealthResponse health() {
        return new ApiDtos.HealthResponse("ok", serviceName);
    }
}
