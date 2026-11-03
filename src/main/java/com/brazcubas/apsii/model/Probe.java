package com.brazcubas.apsii.model;

/**
 * Representa um ponto de medição RIPE Atlas de referência.
 * <p>Coordenadas são públicas e privacy-protected; IP da probe nunca é exposto.</p>
 */
public record Probe(
        int probeId,
        String countryCode,
        Integer asnV4,
        Integer asnV6,
        double latitude,
        double longitude) {
}
