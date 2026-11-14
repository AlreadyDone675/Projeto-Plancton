import { apiClient } from '../service/apiClient';
import { qualityClassifier } from '../service/qualityClassifier';
import { MOCK_MODELS, MOCK_PROBES, generatePredictionsForProbe } from './mockData';

// Cache em memoria para dados carregados do backend Spring Boot ou CSV fallback (48h / 2 dias)
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
    city: meta?.city || `Probe ${item.probeId}`,
    displayName: meta?.displayName || `Probe ${item.probeId}, BR`,
    countryCode: item.countryCode || 'BR',
    asnV4: item.asnV4 ?? meta?.asnV4 ?? null,
    asnV6: item.asnV6 ?? meta?.asnV6 ?? null,
    latitude: item.location?.latitude ?? item.latitude ?? meta?.latitude ?? -23.652,
    longitude: item.location?.longitude ?? item.longitude ?? meta?.longitude ?? -46.732,
    baseRttMs: meta?.baseRttMs ?? 35.0,
    baseLossPct: meta?.baseLossPct ?? 0.0,
    jitterMs: meta?.jitterMs ?? 1.0,
    isRealAtlas: true
  };
}

export const forecastRepository = {
  isBackendConnected() {
    return isBackendOnline;
  },

  setLiveTelemetry(probeId, item) {
    if (!item) return;
    const numericId = Number(probeId);
    liveTelemetryMap.set(numericId, {
      ...item,
      probeId: numericId
    });
  },

  setLiveTelemetryList(list) {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      if (item?.probeId) {
        const rawId = Number(item.probeId);
        liveTelemetryMap.set(rawId, {
          ...item,
          probeId: rawId
        });
      }
    });
  },

  getLiveTelemetry(probeId) {
    const numericId = Number(probeId);
    return liveTelemetryMap.get(numericId) || null;
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

  // Sincronizacao com o backend Spring Boot + pre-carregamento das 2.880 previsoes reais (48h)
  async syncWithBackend() {
    // Carrega o cache inicial de 48h para todas as 15 probes e 4 modelos
    await this.loadFromCsvFallback();

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

  // Le e processa predictions.csv (2.880 linhas reais: 15 probes x 48h x 4 modelos)
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

        if (!timelinesByGroup.has(key)) timelinesByGroup.set(key, []);
        const groupList = timelinesByGroup.get(key);
        const stepIdx = groupList.length;

        const item = {
          predictionId: row[0],
          modelId,
          modelVersion: '1.0',
          probeId,
          predictionFor,
          hourLabel: `${hourStr}:00`,
          dayIndex: Math.floor(stepIdx / 24),
          stepIndex: stepIdx,
          predictedAvgRttMs: rtt,
          predictedPacketLossPct: loss,
          quality: assessment.quality,
          qualityScore: assessment.qualityScore,
          modelConfidence: parseFloat(row[idxConf]) || 0.85,
          hasRealPrediction: true
        };

        groupList.push(item);

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
        timelineCache.set(k, v);
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
      const res = await apiClient.getProbeTimeline(numericId, modelId, 48);
      if (res?.items && Array.isArray(res.items)) {
        const formatted = res.items.map((item, idx) => {
          const predictionFor = item.predictionFor || '';
          const hourStr =
            predictionFor.length >= 13
              ? predictionFor.substring(11, 13)
              : String(idx % 24).padStart(2, '0');
          return {
            predictionId: `api-${modelId}-${numericId}-${String(idx).padStart(2, '0')}`,
            modelId,
            modelVersion: res.model?.version || '1.0',
            probeId: numericId,
            predictionFor,
            hourLabel: `${hourStr}:00`,
            dayIndex: Math.floor(idx / 24),
            stepIndex: idx,
            predictedAvgRttMs: item.predictedAvgRttMs,
            predictedPacketLossPct: item.predictedPacketLossPct,
            quality: item.quality,
            qualityScore: item.qualityScore,
            modelConfidence: 0.88,
            hasRealPrediction: true
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
