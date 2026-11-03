package com.brazcubas.apsii.model;

import java.time.Instant;

/**
 * Metadados de um modelo preditivo do catálogo.
 */
public record PredictionModel(
        String id,
        String name,
        String description,
        String groupName,
        String algorithm,
        String version,
        boolean active,
        Instant createdAt) {
}
