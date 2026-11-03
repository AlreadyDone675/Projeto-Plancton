package com.brazcubas.apsii.model;

import com.brazcubas.apsii.config.ActivityRules;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Requisição para verificação de adequação de uma atividade.
 */
public record ActivityCheckRequest(
        @NotBlank String modelId,
        @DecimalMin("-90.0") @DecimalMax("90.0") double latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") double longitude,
        @NotBlank String dateTime,
        @NotNull ActivityRules.Activity activity) {
}
