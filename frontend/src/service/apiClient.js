/**
 * apiClient.js
 * Cliente HTTP para consumo da Connectivity Forecast API (Spring Boot)
 * e telemetria em tempo real do RIPE Atlas.
 */

import { qualityClassifier } from './qualityClassifier';
import { recommendationService } from './recommendationService';

const API_BASE = '/api/v1';
const RIPE_ATLAS_BASE = 'https://atlas.ripe.net/api/v2';
const DEFAULT_MEASUREMENT_ID = 1001;
const MONITORED_ATLAS_PROBES = [6410, 6891, 6349, 7019, 7242, 7307, 6602, 6790, 7113, 7508];

const MOCK_TO_ATLAS_MAP = {
  900001: 6410,
  900002: 6602,
  900003: 6891,
  900004: 6790,
  900005: 7307,
  900006: 7508,
  900007: 7242,
  900008: 7019,
  900009: 6349,
  900010: 7113
};

let directAtlasCache = new Map();
let lastDirectSyncAt = null;

function parseAtlasMeasurement(node, source = 'RIPE_ATLAS_LIVE') {
  if (!node) return null;
  const probeId = Number(node.prb_id || 0);
  const msmId = Number(node.msm_id || DEFAULT_MEASUREMENT_ID);
  const rawAvg = typeof node.avg === 'number' && node.avg > 0 ? node.avg : 30.0;
  const rawMin = typeof node.min === 'number' && node.min > 0 ? node.min : rawAvg;
  const rawMax = typeof node.max === 'number' && node.max > 0 ? node.max : rawAvg;
  const sent = typeof node.sent === 'number' ? node.sent : 3;
  const rcvd = typeof node.rcvd === 'number' ? node.rcvd : 3;
  const timestampSec = node.timestamp || Math.floor(Date.now() / 1000);

  const avgRttMs = Math.round(rawAvg * 10) / 10;
  const minRttMs = Math.round(rawMin * 10) / 10;
  const maxRttMs = Math.round(rawMax * 10) / 10;
  const packetLossPct =
    sent > 0 ? Math.round(Math.max(0.0, ((sent - rcvd) / sent) * 100.0) * 10) / 10 : 0.0;

  const assessment = qualityClassifier.assess(avgRttMs, packetLossPct);
  const rec = recommendationService.forQuality(assessment.quality);

  return {
    probeId,
    measurementId: msmId,
    source,
    avgRttMs,
    minRttMs,
    maxRttMs,
    packetLossPct,
    sentPackets: sent,
    receivedPackets: rcvd,
    measuredAt: new Date(timestampSec * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    quality: assessment.quality,
    qualityScore: assessment.qualityScore,
    recommendation: rec.code,
    recommendationMessage: rec.message,
    statusMessage: 'Telemetria em tempo real sincronizada diretamente da rede RIPE Atlas'
  };
}

async function fetchDirectFromRipeAtlas(probeIds = MONITORED_ATLAS_PROBES) {
  const idsParam = probeIds.join(',');
  const url = `${RIPE_ATLAS_BASE}/measurements/${DEFAULT_MEASUREMENT_ID}/latest/?probe_ids=${idsParam}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) {
    throw new Error(`RIPE Atlas HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }
  const parsedList = [];
  for (const item of data) {
    const parsed = parseAtlasMeasurement(item, 'RIPE_ATLAS_LIVE');
    if (parsed && parsed.probeId) {
      directAtlasCache.set(parsed.probeId, parsed);
      parsedList.push(parsed);
    }
  }
  lastDirectSyncAt = new Date().toISOString();
  return parsedList;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers
    },
    ...options
  };

  const response = await fetch(url, config);
  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      // resposta nao-JSON
    }
    const message = errorData?.error?.message || `HTTP ${response.status} em ${endpoint}`;
    const err = new Error(message);
    err.status = response.status;
    err.data = errorData;
    throw err;
  }
  return response.json();
}

export const apiClient = {
  // 1. Health
  async getHealth() {
    return request('/health');
  },

  // 2. Modelos
  async getModels() {
    return request('/models');
  },

  // 3. Localizacoes / Probes
  async getLocations() {
    return request('/locations');
  },

  // 4. Previsoes
  async getProbeForecast(probeId, modelId = 'model-a') {
    return request(`/forecasts/probes/${probeId}?model_id=${encodeURIComponent(modelId)}`);
  },

  async getProbeTimeline(probeId, modelId = 'model-a', limit = 24) {
    return request(
      `/forecasts/probes/${probeId}/timeline?model_id=${encodeURIComponent(modelId)}&limit=${limit}`
    );
  },

  async getNearbyForecast(lat, lon, modelId = 'model-a', radiusKm = null) {
    let endpoint = `/forecasts/nearby?lat=${lat}&lon=${lon}&model_id=${encodeURIComponent(modelId)}`;
    if (radiusKm) {
      endpoint += `&radius_km=${radiusKm}`;
    }
    return request(endpoint);
  },

  async compareModels(probeId, predictionFor = null) {
    let endpoint = `/forecasts/probes/${probeId}/compare`;
    if (predictionFor) {
      endpoint += `?prediction_for=${encodeURIComponent(predictionFor)}`;
    }
    return request(endpoint);
  },

  // 5. Atividades
  async checkActivity(payload) {
    return request('/activity/check', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // 6. RIPE Atlas Telemetria ao Vivo (com fallback direto para a API publica do RIPE Atlas)
  async getLiveTelemetry(probeId) {
    try {
      return await request(`/live/probes/${probeId}`);
    } catch {
      const targetAtlasId = MOCK_TO_ATLAS_MAP[Number(probeId)] || Number(probeId);
      if (!directAtlasCache.has(targetAtlasId)) {
        await fetchDirectFromRipeAtlas(MONITORED_ATLAS_PROBES);
      }
      const cached = directAtlasCache.get(targetAtlasId);
      if (cached) {
        return { ...cached, probeId: Number(probeId) };
      }
      return null;
    }
  },

  async getAllLiveProbes() {
    try {
      return await request('/live/probes');
    } catch {
      return await fetchDirectFromRipeAtlas(MONITORED_ATLAS_PROBES);
    }
  },

  async getLiveStatus() {
    try {
      return await request('/live/status');
    } catch {
      if (directAtlasCache.size === 0) {
        try {
          await fetchDirectFromRipeAtlas(MONITORED_ATLAS_PROBES);
        } catch {
          // sem internet para API externa
        }
      }
      return {
        liveSyncEnabled: true,
        defaultMeasurementId: DEFAULT_MEASUREMENT_ID,
        syncRateMs: 600000,
        lastSyncAt: lastDirectSyncAt,
        cachedProbesCount: directAtlasCache.size,
        monitoredProbes: MONITORED_ATLAS_PROBES
      };
    }
  },

  async refreshLive() {
    try {
      return await request('/live/refresh', {
        method: 'POST'
      });
    } catch {
      const list = await fetchDirectFromRipeAtlas(MONITORED_ATLAS_PROBES);
      return {
        status: 'ok',
        refreshedCount: list.length,
        syncedAt: lastDirectSyncAt
      };
    }
  }
};
