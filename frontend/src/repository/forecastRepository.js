import { apiClient } from '../service/apiClient';
import { qualityClassifier } from '../service/qualityClassifier';
import { recommendationService } from '../service/recommendationService';
import { MOCK_MODELS, MOCK_PROBES, generatePredictionsForProbe } from './mockData';

// Cache em memoria para dados carregados do backend Spring Boot ou CSV fallback
let activeProbes = [...MOCK_PROBES];
const timelineCache = new Map(); // chave: `${modelId}-${probeId}`
const liveTelemetryMap = new Map(); // chave: probeId -> LiveTelemetryResponse
let isBackendOnline = false;

// Mapeamento auxiliar de metadados para enriquecimento visual (nomes das cidades/UFs)
const PROBE_METADATA_MAP = new Map(MOCK_PROBES.map((p) => [p.probeId, p]));

function enrichBackendProbe(item) {
  const meta = PROBE_METADATA_MAP.get(Number(item.probeId));
  return {
    probeId: Number(item.probeId),
    atlasProbeId: meta?.atlasProbeId || Number(item.probeId),
    uf: meta?.uf || 'BR',
    city: meta?.city || `Regiao ${item.probeId}`,
    displayName: meta?.displayName || `Regiao ${item.probeId}`,
    countryCode: item.countryCode || 'BR',
    asnV4: item.asnV4 ?? meta?.asnV4 ?? null,
    asnV6: item.asnV6 ?? meta?.asnV6 ?? null,
    latitude: item.location?.latitude ?? item.latitude ?? meta?.latitude ?? -23.5505,
    longitude: item.location?.longitude ?? item.longitude ?? meta?.longitude ?? -46.6333,
    baseRttMs: meta?.baseRttMs ?? 35.0,
    baseLossPct: meta?.baseLossPct ?? 0.0,
    jitterMs: meta?.jitterMs ?? 1.0,
    isRealAtlas: Boolean(meta?.isRealAtlas)
  };
}

function adaptLiveForProbe(rawLive, targetProbeId) {
  if (!rawLive) return null;
  const numericId = Number(targetProbeId);
  const meta = PROBE_METADATA_MAP.get(numericId);
  if (!meta || meta.isRealAtlas || numericId === Number(rawLive.probeId)) {
    return {
      ...rawLive,
      probeId: numericId
    };
  }

  // Para as regioes de referencia (900001..900010), aplica a variacao real medida na ancora RIPE Atlas
  // mantendo o perfil base de cada capital para consistencia entre todas as telas
  const atlasMeta = PROBE_METADATA_MAP.get(meta.atlasProbeId);
  const expectedAtlasRtt = atlasMeta?.baseRttMs > 1 ? atlasMeta.baseRttMs : 35.0;
  const rawRatio = rawLive.avgRttMs > 0 ? rawLive.avgRttMs / expectedAtlasRtt : 1.0;
  const clampedRatio = Math.min(1.25, Math.max(0.8, rawRatio));

  const avgRttMs = Math.max(1.0, Number((meta.baseRttMs * clampedRatio).toFixed(1)));
  const minRttMs = Math.max(0.5, Number((avgRttMs * 0.92).toFixed(1)));
  const maxRttMs = Math.max(avgRttMs, Number((avgRttMs * 1.12).toFixed(1)));
  const packetLossPct = Number(
    Math.min(100.0, Math.max(0.0, meta.baseLossPct + (rawLive.packetLossPct || 0) * 0.25)).toFixed(2)
  );

  const assessment = qualityClassifier.assess(avgRttMs, packetLossPct);
  const rec = recommendationService.forQuality(assessment.quality);

  return {
    ...rawLive,
    probeId: numericId,
    avgRttMs,
    minRttMs,
    maxRttMs,
    packetLossPct,
    quality: assessment.quality,
    qualityScore: assessment.qualityScore,
    recommendation: rec.code,
    recommendationMessage: rec.message
  };
}

export const forecastRepository = {
  isBackendConnected() {
    return isBackendOnline;
  },

  setLiveTelemetry(probeId, item) {
    if (!item) return;
    const numericId = Number(probeId);
    liveTelemetryMap.set(numericId, adaptLiveForProbe(item, numericId));
  },

  setLiveTelemetryList(list) {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      if (item?.probeId) {
        const rawId = Number(item.probeId);
        liveTelemetryMap.set(rawId, adaptLiveForProbe(item, rawId));
      }
    });

    // Propaga tambem para as probes regionais associadas as ancoras RIPE Atlas
    for (const probe of MOCK_PROBES) {
      if (probe.atlasProbeId && liveTelemetryMap.has(probe.atlasProbeId)) {
        const anchorLive = liveTelemetryMap.get(probe.atlasProbeId);
        liveTelemetryMap.set(probe.probeId, adaptLiveForProbe(anchorLive, probe.probeId));
      }
    }
  },

  getLiveTelemetry(probeId) {
    const numericId = Number(probeId);
    if (liveTelemetryMap.has(numericId)) {
      return liveTelemetryMap.get(numericId);
    }
    const meta = PROBE_METADATA_MAP.get(numericId);
    if (meta?.atlasProbeId && liveTelemetryMap.has(meta.atlasProbeId)) {
      const adapted = adaptLiveForProbe(liveTelemetryMap.get(meta.atlasProbeId), numericId);
      liveTelemetryMap.set(numericId, adapted);
      return adapted;
    }
    return null;
  },

  findAllModels() {
    return MOCK_MODELS;
  },

  findModelById(modelId) {
    return MOCK_MODELS.find((m) => m.id === modelId) || null;
  },

  findAllProbes() {
    return activeProbes;
  },

  findProbeById(probeId) {
    return activeProbes.find((p) => p.probeId === Number(probeId)) || null;
  },

  findByModelAndProbe(modelId, probeId) {
    const numericId = Number(probeId);
    const key = `${modelId}-${numericId}`;
    if (timelineCache.has(key)) {
      return timelineCache.get(key);
    }
    const probe = this.findProbeById(numericId);
    if (!probe) return [];
    return generatePredictionsForProbe(probe.probeId, modelId);
  },

  // Sincronizacao com o backend ou Fallback via predictions.csv + API RIPE Atlas ao vivo
  async syncWithBackend() {
    let backendSuccess = false;
    try {
      const locationsData = await apiClient.getLocations();
      if (locationsData?.items && Array.isArray(locationsData.items)) {
        activeProbes = locationsData.items.map(enrichBackendProbe);
        isBackendOnline = true;
        backendSuccess = true;
      }
    } catch {
      isBackendOnline = false;
      await this.loadFromCsvFallback();
    }

    try {
      const liveList = await apiClient.getAllLiveProbes();
      if (Array.isArray(liveList) && liveList.length > 0) {
        this.setLiveTelemetryList(liveList);
      }
    } catch {
      // Caso sem rede externa, mantem dados locais
    }

    return {
      success: backendSuccess,
      fallback: !backendSuccess,
      count: activeProbes.length
    };
  },

  // Fallback que le e processa predictions.csv quando o backend esta offline
  async loadFromCsvFallback() {
    try {
      const res = await fetch('/predictions.csv');
      if (!res.ok) return false;
      const text = await res.text();
      const lines = text.trim().split('\n');
      if (lines.length <= 1) return false;

      const header = lines[0].split(',').map((h) => h.trim());
      const idxModel = header.indexOf('model_id');
      const idxProbe = header.indexOf('probe_id');
      const idxFor = header.indexOf('prediction_for');
      const idxRtt = header.indexOf('predicted_avg_rtt_ms');
      const idxLoss = header.indexOf('predicted_packet_loss_pct');
      const idxConf = header.indexOf('model_confidence');
      const idxLat = header.indexOf('latitude');
      const idxLon = header.indexOf('longitude');
      const idxAsn = header.indexOf('asn_v4');

      const probesMap = new Map();
      const timelinesByGroup = new Map();

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((c) => c.trim());
        if (row.length < 10) continue;

        const modelId = row[idxModel];
        const probeId = Number(row[idxProbe]);
        const key = `${modelId}-${probeId}`;
        const predictionFor = row[idxFor];
        const hourStr = predictionFor ? predictionFor.substring(11, 13) : '00';
        const rtt = parseFloat(row[idxRtt]) || 30.0;
        const loss = parseFloat(row[idxLoss]) || 0.0;

        const assessment = qualityClassifier.assess(rtt, loss);

        const item = {
          predictionId: row[0],
          modelId,
          modelVersion: '1.0',
          probeId,
          predictionFor,
          hourLabel: `${hourStr}:00`,
          predictedAvgRttMs: rtt,
          predictedPacketLossPct: loss,
          quality: assessment.quality,
          qualityScore: assessment.qualityScore,
          modelConfidence: parseFloat(row[idxConf]) || 0.85
        };

        if (!timelinesByGroup.has(key)) timelinesByGroup.set(key, []);
        timelinesByGroup.get(key).push(item);

        if (!probesMap.has(probeId)) {
          const lat = parseFloat(row[idxLat]) || 0;
          const lon = parseFloat(row[idxLon]) || 0;
          const asnv4 = row[idxAsn] ? Number(row[idxAsn]) : null;
          const enriched = enrichBackendProbe({
            probeId,
            location: { latitude: lat, longitude: lon },
            countryCode: 'BR',
            asnV4: asnv4
          });
          probesMap.set(probeId, enriched);
        }
      }

      if (probesMap.size > 0) {
        activeProbes = Array.from(probesMap.values());
      }
      for (const [k, v] of timelinesByGroup.entries()) {
        // Para as probes de referencia (900001..900010), usa a curva padronizada da regiao
        // para evitar discrepancias de qualidade entre telas
        const [, probeIdPart] = k.split('-').slice(-2);
        const parsedProbeId = Number(k.substring(k.lastIndexOf('-') + 1));
        const meta = PROBE_METADATA_MAP.get(parsedProbeId);
        if (meta && !meta.isRealAtlas) {
          const modelIdPart = k.substring(0, k.lastIndexOf('-'));
          timelineCache.set(k, generatePredictionsForProbe(parsedProbeId, modelIdPart));
        } else {
          timelineCache.set(k, v);
        }
      }
      return true;
    } catch {
      return false;
    }
  },

  async loadBackendTimeline(probeId, modelId = 'model-a') {
    const numericId = Number(probeId);
    const key = `${modelId}-${numericId}`;
    try {
      const res = await apiClient.getProbeTimeline(numericId, modelId, 24);
      if (res?.items && Array.isArray(res.items)) {
        const meta = PROBE_METADATA_MAP.get(numericId);
        if (meta && !meta.isRealAtlas) {
          const generated = generatePredictionsForProbe(numericId, modelId);
          timelineCache.set(key, generated);
          isBackendOnline = true;
          return generated;
        }
        const formatted = res.items.map((item, idx) => {
          const hourStr = String(idx).padStart(2, '0');
          return {
            predictionId: `api-${modelId}-${numericId}-${hourStr}`,
            modelId,
            modelVersion: res.model?.version || '1.0',
            probeId: numericId,
            predictionFor: item.predictionFor,
            hourLabel: `${hourStr}:00`,
            predictedAvgRttMs: item.predictedAvgRttMs,
            predictedPacketLossPct: item.predictedPacketLossPct,
            quality: item.quality,
            qualityScore: item.qualityScore,
            modelConfidence: 0.88
          };
        });
        timelineCache.set(key, formatted);
        isBackendOnline = true;
        return formatted;
      }
    } catch {
      if (!timelineCache.has(key)) {
        await this.loadFromCsvFallback();
      }
    }
    return this.findByModelAndProbe(modelId, numericId);
  }
};
