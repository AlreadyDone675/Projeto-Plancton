// Estruturas simples de criacao de objetos (espelhando ApiDtos.java do backend)

export function createAssessment(quality, qualityScore) {
  return { quality, qualityScore };
}

export function createRecommendation(code, message) {
  return { code, message };
}

export function createNearbyForecastResponse({
  model,
  requestedLocation,
  matchedProbe,
  probeInfo,
  prediction,
  assessment,
  recommendation,
  metadata
}) {
  return {
    model,
    requestedLocation,
    matchedProbe,
    probeInfo,
    prediction,
    assessment,
    recommendation,
    metadata
  };
}
