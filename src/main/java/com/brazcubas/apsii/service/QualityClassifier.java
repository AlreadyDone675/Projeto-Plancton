package com.brazcubas.apsii.service;

import com.brazcubas.apsii.config.QualityRules;
import com.brazcubas.apsii.config.QualityRules.Quality;
import org.springframework.stereotype.Service;

/**
 * Classifica a qualidade da conexão com base em RTT e perda de pacotes.
 */
@Service
public class QualityClassifier {

    /**
     * Classifica a qualidade da conexão.
     *
     * @param rtt          tempo de ida e volta em ms
     * @param packetLoss   perda de pacotes em porcentagem
     * @return rótulo de qualidade: GOOD, MODERATE ou UNSTABLE
     */
    public String classify(double rtt, double packetLoss) {
        return assess(rtt, packetLoss).quality().name();
    }

    public QualityAssessment assess(double rtt, double packetLoss) {
        if (!Double.isFinite(rtt) || !Double.isFinite(packetLoss) || rtt < 0 || packetLoss < 0) {
            throw new IllegalArgumentException("Prediction metrics must be finite and non-negative");
        }

        Quality rttQuality = level(rtt, QualityRules.MODERATE_RTT_MS, QualityRules.UNSTABLE_RTT_MS);
        Quality lossQuality = level(packetLoss, QualityRules.MODERATE_PACKET_LOSS, QualityRules.UNSTABLE_PACKET_LOSS);
        Quality quality = QualityRules.rank(rttQuality) <= QualityRules.rank(lossQuality)
                ? rttQuality
                : lossQuality;

        double rttScore = Math.max(0.0, 1.0 - rtt / QualityRules.SCORE_RTT_REF_MS)
                * QualityRules.RTT_WEIGHT * 100.0;
        double lossScore = Math.max(0.0, 1.0 - packetLoss / QualityRules.SCORE_LOSS_REF_PCT)
                * QualityRules.PACKET_LOSS_WEIGHT * 100.0;
        int score = (int) Math.rint(Math.min(100.0, Math.max(0.0, rttScore + lossScore)));
        return new QualityAssessment(quality, score);
    }

    /**
     * Calcula score de 0 a 100 ponderando RTT e perda de pacotes.
     *
     * @param rtt         ms
     * @param packetLoss  perda percentual
     * @return score
     */
    public int score(double rtt, double packetLoss) {
        return assess(rtt, packetLoss).qualityScore();
    }

    private static Quality level(double value, double moderate, double unstable) {
        if (value >= unstable) {
            return Quality.UNSTABLE;
        }
        if (value >= moderate) {
            return Quality.MODERATE;
        }
        return Quality.GOOD;
    }

    public record QualityAssessment(Quality quality, int qualityScore) {}
}
