// Dados de referencia dos modelos e das 15 probes reais do RIPE Atlas no Brasil
// sincronizados com as medicoes mais recentes como fallback imediato (48h / 2 dias)

export const MOCK_MODELS = [
  {
    id: 'model-a',
    name: 'Modelo A',
    description: 'Modelo de previsao desenvolvido pelo Grupo 1.',
    groupName: 'Grupo 1',
    algorithm: 'Linear Regression',
    version: '1.0',
    active: true,
    createdAt: '2026-08-01T00:00:00Z'
  },
  {
    id: 'model-b',
    name: 'Modelo B',
    description: 'Modelo de previsao desenvolvido pelo Grupo 2.',
    groupName: 'Grupo 2',
    algorithm: 'Random Forest',
    version: '1.0',
    active: true,
    createdAt: '2026-08-01T00:00:00Z'
  },
  {
    id: 'model-c',
    name: 'Modelo C',
    description: 'Modelo de previsao desenvolvido pelo Grupo 3.',
    groupName: 'Grupo 3',
    algorithm: 'Decision Tree',
    version: '1.0',
    active: true,
    createdAt: '2026-08-01T00:00:00Z'
  },
  {
    id: 'model-d',
    name: 'Modelo D',
    description: 'Modelo de previsao desenvolvido pelo Grupo 4.',
    groupName: 'Grupo 4',
    algorithm: 'Gradient Boosting',
    version: '1.0',
    active: true,
    createdAt: '2026-08-01T00:00:00Z'
  },
  {
    id: 'model-inactive',
    name: 'Modelo Inativo',
    description: 'Modelo desativado.',
    groupName: 'Reservado',
    algorithm: 'None',
    version: '0.0',
    active: false,
    createdAt: '2026-08-01T00:00:00Z'
  }
];

export const MOCK_PROBES = [
  {
    probeId: 6790,
    atlasProbeId: 6790,
    uf: 'SP',
    city: 'Sao Paulo (Vila Mariana)',
    displayName: 'Sao Paulo (Vila Mariana), SP',
    countryCode: 'BR',
    asnV4: 57695,
    asnV6: 57695,
    latitude: -23.582,
    longitude: -46.638,
    baseRttMs: 34.8,
    baseLossPct: 0.0,
    jitterMs: 0.29,
    isRealAtlas: true
  },
  {
    probeId: 6410,
    atlasProbeId: 6410,
    uf: 'SP',
    city: 'Sao Paulo (Zona Sul)',
    displayName: 'Sao Paulo (Zona Sul), SP',
    countryCode: 'BR',
    asnV4: 22548,
    asnV6: 22548,
    latitude: -23.652,
    longitude: -46.732,
    baseRttMs: 46.4,
    baseLossPct: 0.0,
    jitterMs: 1.34,
    isRealAtlas: true
  },
  {
    probeId: 6891,
    atlasProbeId: 6891,
    uf: 'MG',
    city: 'Belo Horizonte',
    displayName: 'Belo Horizonte, MG',
    countryCode: 'BR',
    asnV4: 271354,
    asnV6: 271354,
    latitude: -19.872,
    longitude: -43.958,
    baseRttMs: 20.5,
    baseLossPct: 0.0,
    jitterMs: 2.15,
    isRealAtlas: true
  },
  {
    probeId: 7019,
    atlasProbeId: 7019,
    uf: 'PR',
    city: 'Ponta Grossa',
    displayName: 'Ponta Grossa, PR',
    countryCode: 'BR',
    asnV4: 53046,
    asnV6: 53046,
    latitude: -25.088,
    longitude: -50.102,
    baseRttMs: 0.6,
    baseLossPct: 0.0,
    jitterMs: 0.34,
    isRealAtlas: true
  },
  {
    probeId: 6349,
    atlasProbeId: 6349,
    uf: 'RS',
    city: 'Porto Alegre',
    displayName: 'Porto Alegre, RS',
    countryCode: 'BR',
    asnV4: 2716,
    asnV6: 2716,
    latitude: -30.069,
    longitude: -51.12,
    baseRttMs: 124.4,
    baseLossPct: 0.0,
    jitterMs: 2.77,
    isRealAtlas: true
  },
  {
    probeId: 7307,
    atlasProbeId: 7307,
    uf: 'BA',
    city: 'Feira de Santana',
    displayName: 'Feira de Santana, BA',
    countryCode: 'BR',
    asnV4: 264479,
    asnV6: 264479,
    latitude: -12.239,
    longitude: -38.972,
    baseRttMs: 34.5,
    baseLossPct: 0.0,
    jitterMs: 0.59,
    isRealAtlas: true
  },
  {
    probeId: 11315,
    atlasProbeId: 11315,
    uf: 'PE',
    city: 'Recife',
    displayName: 'Recife, PE',
    countryCode: 'BR',
    asnV4: 262792,
    asnV6: 262792,
    latitude: -8.111,
    longitude: -34.919,
    baseRttMs: 22.2,
    baseLossPct: 0.0,
    jitterMs: 0.4,
    isRealAtlas: true
  },
  {
    probeId: 7242,
    atlasProbeId: 7242,
    uf: 'CE',
    city: 'Fortaleza',
    displayName: 'Fortaleza, CE',
    countryCode: 'BR',
    asnV4: 37468,
    asnV6: 37468,
    latitude: -3.741,
    longitude: -38.46,
    baseRttMs: 66.0,
    baseLossPct: 0.0,
    jitterMs: 0.37,
    isRealAtlas: true
  },
  {
    probeId: 7113,
    atlasProbeId: 7113,
    uf: 'SP',
    city: 'Barueri (Tambore)',
    displayName: 'Barueri (Tambore), SP',
    countryCode: 'BR',
    asnV4: 52863,
    asnV6: 52863,
    latitude: -23.502,
    longitude: -46.832,
    baseRttMs: 201.9,
    baseLossPct: 0.0,
    jitterMs: 1.91,
    isRealAtlas: true
  },
  {
    probeId: 6602,
    atlasProbeId: 6602,
    uf: 'SP',
    city: 'Santana de Parnaiba',
    displayName: 'Santana de Parnaiba, SP',
    countryCode: 'BR',
    asnV4: 36236,
    asnV6: 36236,
    latitude: -23.471,
    longitude: -46.862,
    baseRttMs: 33.0,
    baseLossPct: 0.0,
    jitterMs: 0.32,
    isRealAtlas: true
  },
  {
    probeId: 6659,
    atlasProbeId: 6659,
    uf: 'SP',
    city: 'Barueri (Alphaville)',
    displayName: 'Barueri (Alphaville), SP',
    countryCode: 'BR',
    asnV4: 202422,
    asnV6: 199524,
    latitude: -23.489,
    longitude: -46.841,
    baseRttMs: 43.8,
    baseLossPct: 0.0,
    jitterMs: 0.57,
    isRealAtlas: true
  },
  {
    probeId: 6977,
    atlasProbeId: 6977,
    uf: 'SP',
    city: 'Osasco',
    displayName: 'Osasco, SP',
    countryCode: 'BR',
    asnV4: 16552,
    asnV6: 16552,
    latitude: -23.489,
    longitude: -46.808,
    baseRttMs: 45.4,
    baseLossPct: 0.0,
    jitterMs: 0.84,
    isRealAtlas: true
  },
  {
    probeId: 7508,
    atlasProbeId: 7508,
    uf: 'SP',
    city: 'Sao Paulo (Zona Oeste)',
    displayName: 'Sao Paulo (Zona Oeste), SP',
    countryCode: 'BR',
    asnV4: 14907,
    asnV6: 14907,
    latitude: -23.488,
    longitude: -46.782,
    baseRttMs: 46.5,
    baseLossPct: 0.0,
    jitterMs: 0.49,
    isRealAtlas: true
  },
  {
    probeId: 7708,
    atlasProbeId: 7708,
    uf: 'SP',
    city: 'Sao Paulo (Ibirapuera)',
    displayName: 'Sao Paulo (Ibirapuera), SP',
    countryCode: 'BR',
    asnV4: 401612,
    asnV6: 401612,
    latitude: -23.581,
    longitude: -46.639,
    baseRttMs: 32.3,
    baseLossPct: 0.0,
    jitterMs: 0.3,
    isRealAtlas: true
  },
  {
    probeId: 7848,
    atlasProbeId: 7848,
    uf: 'SP',
    city: 'Sao Paulo (Butanta)',
    displayName: 'Sao Paulo (Butanta), SP',
    countryCode: 'BR',
    asnV4: 47583,
    asnV6: 47583,
    latitude: -23.49,
    longitude: -46.781,
    baseRttMs: 32.8,
    baseLossPct: 0.0,
    jitterMs: 0.53,
    isRealAtlas: true
  }
];

export const HOURLY_DELTAS = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  rttFactor: 1.0,
  lossDelta: 0.0
}));

export const MODEL_OFFSETS = {
  'model-a': { rttAdd: 0.0, lossAdd: 0.0 },
  'model-b': { rttAdd: 1.2, lossAdd: 0.02 },
  'model-c': { rttAdd: -0.8, lossAdd: 0.0 },
  'model-d': { rttAdd: 2.1, lossAdd: 0.04 }
};

export function generatePredictionsForProbe(probeId, modelId = 'model-a') {
  const probe = MOCK_PROBES.find((p) => p.probeId === Number(probeId)) || MOCK_PROBES[0];
  const modelOffset = MODEL_OFFSETS[modelId] || MODEL_OFFSETS['model-a'];

  return Array.from({ length: 48 }, (_, idx) => {
    const hourOfDay = idx % 24;
    const dayOffset = Math.floor(idx / 24);
    const hourStr = String(hourOfDay).padStart(2, '0');
    const stepStr = String(idx).padStart(2, '0');
    const datePart = dayOffset === 0 ? '2026-11-14' : '2026-11-15';

    const rtt = Math.max(1.0, Number((probe.baseRttMs + modelOffset.rttAdd).toFixed(1)));
    const loss = Math.max(0.0, Number((probe.baseLossPct + modelOffset.lossAdd).toFixed(2)));

    return {
      predictionId: `atlas-${modelId}-${probe.probeId}-${stepStr}`,
      modelId,
      modelVersion: '1.0',
      probeId: probe.probeId,
      countryCode: probe.countryCode,
      asnV4: probe.asnV4,
      latitude: probe.latitude,
      longitude: probe.longitude,
      predictionGeneratedAt: '2026-11-14T00:00:00Z',
      predictionFor: `${datePart}T${hourStr}:00:00Z`,
      hourLabel: `${hourStr}:00`,
      dayIndex: dayOffset,
      predictedAvgRttMs: rtt,
      predictedPacketLossPct: loss,
      modelConfidence: 0.88
    };
  });
}
