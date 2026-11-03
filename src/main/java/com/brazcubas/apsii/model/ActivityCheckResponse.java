package com.brazcubas.apsii.model;

import com.brazcubas.apsii.config.ActivityRules;

/**
 * Resposta da verificação de adequação de atividade.
 */
public record ActivityCheckResponse(
        ApiDtos.ModelReference model,
        ActivityRules.Activity activity,
        boolean suitable,
        ApiDtos.ActivityForecast forecast,
        ApiDtos.Recommendation recommendation,
        ApiDtos.NearbyMetadata metadata) {
}
