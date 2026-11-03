package com.brazcubas.apsii.config;

/**
 * Regras experimentais de classificação de qualidade de conexão.
 * <p>Esses limiares são regras de negócio, não padrões científicos.</p>
 */
public final class QualityRules {
    private QualityRules() {}

    public enum Quality { GOOD, MODERATE, UNSTABLE }

    public static final double MODERATE_RTT_MS = 60.0;
    public static final double UNSTABLE_RTT_MS = 150.0;
    public static final double MODERATE_PACKET_LOSS = 1.0;
    public static final double UNSTABLE_PACKET_LOSS = 5.0;
    public static final double SCORE_RTT_REF_MS = 200.0;
    public static final double SCORE_LOSS_REF_PCT = 10.0;
    public static final double RTT_WEIGHT = 0.7;
    public static final double PACKET_LOSS_WEIGHT = 0.3;

    public static int rank(Quality quality) {
        return switch (quality) {
            case UNSTABLE -> 0;
            case MODERATE -> 1;
            case GOOD -> 2;
        };
    }
}
