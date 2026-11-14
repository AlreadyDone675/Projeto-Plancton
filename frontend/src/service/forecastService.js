import { ACTIVITIES, MODEL_FALLBACK_ORDER } from '../config/qualityRules';
import { createNearbyForecastResponse } from '../model/dtos';
import { forecastRepository } from '../repository/forecastRepository';
import { HOURLY_DELTAS, MODEL_OFFSETS } from '../repository/mockData';
import { apiClient } from './apiClient';
import { qualityClassifier } from './qualityClassifier';
import { recommendationService } from './recommendationService';

const NEARBY_DISCLAIMER =
  'A previsao esta associada a probe selecionada como referencia geografica e nao representa uma medicao direta do dispositivo do usuario.';
const LOCATION_PRIVACY =
  'As coordenadas publicas recebem protecao de privacidade e nao devem ser tratadas como a localizacao exata do usuario.';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const toRad = (deg) => (deg * Math.PI) / 180.0;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

function resolveActiveModel(preferredModelId = 'model-a', simulatedInactiveIds = []) {
  const queue = [
    preferredModelId,
    ...MODEL_FALLBACK_ORDER.filter((id) => id !== preferredModelId)
  ];

  for (const candidateId of queue) {
    if (simulatedInactiveIds.includes(candidateId)) {
      continue;
    }
    const model = forecastRepository.findModelById(candidateId);
    if (model && model.active) {
      return {
        model,
        usedFallback: candidateId !== preferredModelId
      };
    }
  }

  const fallbackModel = forecastRepository.findModelById('model-a');
  return { model: fallbackModel, usedFallback: false };
}

export const forecastService = {
  getProbeTimeline(
    probeId,
    preferredModelId = 'model-a',
    simulatedInactiveIds = [],
    referenceHour = new Date().getHours()
  ) {
    const { model, usedFallback } = resolveActiveModel(preferredModelId, simulatedInactiveIds);
    const probe =
      forecastRepository.findProbeById(probeId) || forecastRepository.findAllProbes()[0];
    const records = forecastRepository.findByModelAndProbe(model.id, probe.probeId);
    const live = forecastRepository.getLiveTelemetry(probe.probeId);
    const safeRefHour = Math.min(23, Math.max(0, Number(referenceHour) || 0));
    const refDelta = HOURLY_DELTAS[safeRefHour] || HOURLY_DELTAS[9];
    const modelOffset = MODEL_OFFSETS[model.id] || MODEL_OFFSETS['model-a'];

    const items = records.map((rec, idx) => {
      let rtt = rec.predictedAvgRttMs;
      let loss = rec.predictedPacketLossPct;

      // No horario atual (Agora), reflete a leitura ao vivo mais recente do RIPE Atlas quando disponivel
      if (idx === safeRefHour && live && typeof live.avgRttMs === 'number') {
        rtt = Math.max(1.0, Number((live.avgRttMs + modelOffset.rttAdd).toFixed(1)));
        loss = Math.max(
          0.0,
          Number(((live.packetLossPct || 0) + modelOffset.lossAdd).toFixed(2))
        );
      } else if (!rec.hasRealPrediction && live && typeof live.avgRttMs === 'number') {
        const slotDelta = HOURLY_DELTAS[idx % 24] || refDelta;
        const factor = refDelta.rttFactor > 0 ? slotDelta.rttFactor / refDelta.rttFactor : 1.0;
        const lossDiff = slotDelta.lossDelta - refDelta.lossDelta;
        rtt = Math.max(
          1.0,
          Number((live.avgRttMs * factor + modelOffset.rttAdd).toFixed(1))
        );
        loss = Math.max(
          0.0,
          Number(((live.packetLossPct || 0) + lossDiff + modelOffset.lossAdd).toFixed(2))
        );
      }

      const assessment = qualityClassifier.assess(rtt, loss);
      return {
        predictionFor: rec.predictionFor,
        hourLabel: rec.hourLabel,
        dayIndex: rec.dayIndex ?? Math.floor(idx / 24),
        stepIndex: idx,
        predictedAvgRttMs: rtt,
        predictedPacketLossPct: loss,
        quality: assessment.quality,
        qualityScore: assessment.qualityScore
      };
    });

    return {
      model: { id: model.id, name: model.name, version: model.version, usedFallback },
      probeId: probe.probeId,
      probeInfo: probe,
      items
    };
  },

  getNearbyForecast(
    latitude,
    longitude,
    preferredModelId = 'model-a',
    referenceHour = new Date().getHours(),
    simulatedInactiveIds = []
  ) {
    const { model, usedFallback } = resolveActiveModel(preferredModelId, simulatedInactiveIds);
    const probes = forecastRepository.findAllProbes();

    let nearestProbe = probes[0];
    let minDistance = Infinity;

    for (const probe of probes) {
      const dist = haversineKm(latitude, longitude, probe.latitude, probe.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestProbe = probe;
      }
    }

    const timeline = this.getProbeTimeline(
      nearestProbe.probeId,
      preferredModelId,
      simulatedInactiveIds,
      referenceHour
    );
    const currentRecord =
      timeline.items[referenceHour] || timeline.items[8] || timeline.items[0];
    const assessment = {
      quality: currentRecord.quality,
      qualityScore: currentRecord.qualityScore
    };
    const recommendation = recommendationService.forQuality(assessment.quality);

    const activitiesStatus = [...ACTIVITIES]
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
      .map((act) => {
        const result = recommendationService.forActivity(act.id, assessment.quality);
        return {
          id: act.id,
          label: act.label,
          shortLabel: act.shortLabel,
          suitable: result.suitable,
          recommendation: result.recommendation
        };
      });

    return {
      ...createNearbyForecastResponse({
        model: {
          id: model.id,
          name: model.name,
          algorithm: model.algorithm,
          version: model.version,
          usedFallback
        },
        requestedLocation: { latitude, longitude },
        matchedProbe: {
          probeId: nearestProbe.probeId,
          distanceKm: minDistance
        },
        probeInfo: nearestProbe,
        prediction: {
          predictionFor: currentRecord.predictionFor,
          hourLabel: currentRecord.hourLabel,
          predictedAvgRttMs: currentRecord.predictedAvgRttMs,
          predictedPacketLossPct: currentRecord.predictedPacketLossPct,
          stabilityPct: Number((100 - currentRecord.predictedPacketLossPct).toFixed(2)),
          jitterMs: nearestProbe.jitterMs
        },
        assessment,
        recommendation,
        metadata: {
          disclaimer: NEARBY_DISCLAIMER,
          locationPrivacy: LOCATION_PRIVACY
        }
      }),
      activitiesStatus
    };
  },

  listAllProbesWithForecast(
    preferredModelId = 'model-a',
    referenceHour = new Date().getHours(),
    simulatedInactiveIds = []
  ) {
    const { model, usedFallback } = resolveActiveModel(preferredModelId, simulatedInactiveIds);
    const probes = forecastRepository.findAllProbes();

    return probes.map((probe) => {
      const timeline = this.getProbeTimeline(
        probe.probeId,
        preferredModelId,
        simulatedInactiveIds,
        referenceHour
      );
      const currentRecord =
        timeline.items[referenceHour] || timeline.items[8] || timeline.items[0];
      const assessment = {
        quality: currentRecord.quality,
        qualityScore: currentRecord.qualityScore
      };
      const recommendation = recommendationService.forQuality(assessment.quality);

      return {
        probeId: probe.probeId,
        uf: probe.uf,
        city: probe.city,
        displayName: probe.displayName,
        countryCode: probe.countryCode,
        isRealAtlas: Boolean(probe.isRealAtlas),
        location: {
          latitude: probe.latitude,
          longitude: probe.longitude
        },
        model: {
          id: model.id,
          name: model.name,
          version: model.version,
          usedFallback
        },
        prediction: {
          predictionFor: currentRecord.predictionFor,
          hourLabel: currentRecord.hourLabel,
          predictedAvgRttMs: currentRecord.predictedAvgRttMs,
          predictedPacketLossPct: currentRecord.predictedPacketLossPct,
          stabilityPct: Number((100 - currentRecord.predictedPacketLossPct).toFixed(2)),
          jitterMs: probe.jitterMs
        },
        assessment,
        recommendation
      };
    }).sort((a, b) =>
      `${a.uf} - ${a.city}`.localeCompare(`${b.uf} - ${b.city}`, 'pt-BR')
    );
  },

  checkActivity({
    probeId,
    hour = 14,
    dayOffset = 0,
    activity = 'VIDEO_CALL',
    preferredModelId = 'model-a',
    simulatedInactiveIds = [],
    referenceHour = new Date().getHours()
  }) {
    const { model, usedFallback } = resolveActiveModel(preferredModelId, simulatedInactiveIds);
    const probe =
      forecastRepository.findProbeById(probeId) || forecastRepository.findAllProbes()[0];
    const timeline = this.getProbeTimeline(
      probe.probeId,
      preferredModelId,
      simulatedInactiveIds,
      referenceHour
    );
    const slotIdx = Math.min(
      Math.max(0, Number(dayOffset) + Number(hour)),
      Math.max(0, timeline.items.length - 1)
    );
    const targetRecord =
      timeline.items[slotIdx] || timeline.items[hour] || timeline.items[0];

    const assessment = {
      quality: targetRecord.quality,
      qualityScore: targetRecord.qualityScore
    };
    const { suitable, recommendation } = recommendationService.forActivity(
      activity,
      assessment.quality
    );

    return {
      model: { id: model.id, name: model.name, version: model.version, usedFallback },
      probeInfo: probe,
      activity,
      suitable,
      forecast: {
        predictionFor: targetRecord.predictionFor,
        hourLabel: targetRecord.hourLabel,
        dayIndex: targetRecord.dayIndex ?? (dayOffset >= 24 ? 1 : 0),
        quality: assessment.quality,
        qualityScore: assessment.qualityScore,
        predictedAvgRttMs: targetRecord.predictedAvgRttMs,
        predictedPacketLossPct: targetRecord.predictedPacketLossPct,
        jitterMs: probe.jitterMs
      },
      recommendation,
      metadata: {
        disclaimer: NEARBY_DISCLAIMER,
        locationPrivacy: LOCATION_PRIVACY
      }
    };
  },

  // Integracao com endpoints ao vivo do RIPE Atlas
  async getLiveTelemetry(probeId) {
    try {
      const data = await apiClient.getLiveTelemetry(probeId);
      if (data) {
        forecastRepository.setLiveTelemetry(probeId, data);
      }
      return forecastRepository.getLiveTelemetry(probeId);
    } catch {
      return forecastRepository.getLiveTelemetry(probeId);
    }
  },

  async getAllLiveProbes() {
    try {
      const list = await apiClient.getAllLiveProbes();
      if (Array.isArray(list) && list.length > 0) {
        forecastRepository.setLiveTelemetryList(list);
      }
      return list;
    } catch {
      return [];
    }
  },

  async getLiveStatus() {
    try {
      return await apiClient.getLiveStatus();
    } catch {
      return null;
    }
  },

  async refreshLive() {
    try {
      const res = await apiClient.refreshLive();
      const list = await apiClient.getAllLiveProbes();
      if (Array.isArray(list) && list.length > 0) {
        forecastRepository.setLiveTelemetryList(list);
      }
      return res;
    } catch {
      return null;
    }
  },

  async syncWithBackend() {
    return await forecastRepository.syncWithBackend();
  },

  async loadBackendTimeline(probeId, modelId = 'model-a') {
    return await forecastRepository.loadBackendTimeline(probeId, modelId);
  }
};
