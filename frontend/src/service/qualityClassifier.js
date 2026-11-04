import { QUALITY, QUALITY_THRESHOLDS } from '../config/qualityRules';

function level(value, moderate, unstable) {
  if (value >= unstable) return QUALITY.UNSTABLE;
  if (value >= moderate) return QUALITY.MODERATE;
  return QUALITY.GOOD;
}

function rank(quality) {
  if (quality === QUALITY.UNSTABLE) return 0;
  if (quality === QUALITY.MODERATE) return 1;
  return 2;
}

// Espelha QualityClassifier.java do backend
export const qualityClassifier = {
  assess(rtt, packetLoss) {
    const rttQuality = level(
      rtt,
      QUALITY_THRESHOLDS.MODERATE_RTT_MS,
      QUALITY_THRESHOLDS.UNSTABLE_RTT_MS
    );
    const lossQuality = level(
      packetLoss,
      QUALITY_THRESHOLDS.MODERATE_PACKET_LOSS,
      QUALITY_THRESHOLDS.UNSTABLE_PACKET_LOSS
    );

    const quality = rank(rttQuality) <= rank(lossQuality) ? rttQuality : lossQuality;

    const rttScore =
      Math.max(0.0, 1.0 - rtt / QUALITY_THRESHOLDS.SCORE_RTT_REF_MS) *
      QUALITY_THRESHOLDS.RTT_WEIGHT *
      100.0;
    const lossScore =
      Math.max(0.0, 1.0 - packetLoss / QUALITY_THRESHOLDS.SCORE_LOSS_REF_PCT) *
      QUALITY_THRESHOLDS.PACKET_LOSS_WEIGHT *
      100.0;

    const qualityScore = Math.round(Math.min(100.0, Math.max(0.0, rttScore + lossScore)));

    return { quality, qualityScore };
  },

  rank
};
