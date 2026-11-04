// Regras de classificacao de qualidade e atividades (espelhando QualityRules.java e ActivityRules.java)

export const QUALITY = {
  GOOD: 'GOOD',
  MODERATE: 'MODERATE',
  UNSTABLE: 'UNSTABLE'
};

export const QUALITY_LABELS = {
  GOOD: 'Excelente',
  MODERATE: 'Moderada',
  UNSTABLE: 'Instavel'
};

export const QUALITY_SHORT_LABELS = {
  GOOD: 'Excelente',
  MODERATE: 'Moderada',
  UNSTABLE: 'Instavel'
};

export const QUALITY_THRESHOLDS = {
  MODERATE_RTT_MS: 60.0,
  UNSTABLE_RTT_MS: 150.0,
  MODERATE_PACKET_LOSS: 1.0,
  UNSTABLE_PACKET_LOSS: 5.0,
  SCORE_RTT_REF_MS: 200.0,
  SCORE_LOSS_REF_PCT: 10.0,
  RTT_WEIGHT: 0.7,
  PACKET_LOSS_WEIGHT: 0.3
};

export const RECOMMENDATION_CODES = {
  NORMAL_USE: 'NORMAL_USE',
  REDUCE_NETWORK_USAGE: 'REDUCE_NETWORK_USAGE',
  PREPARE_OFFLINE: 'PREPARE_OFFLINE'
};

export const RECOMMENDATION_LABELS = {
  NORMAL_USE: 'Uso normal',
  REDUCE_NETWORK_USAGE: 'Reduzir uso da rede',
  PREPARE_OFFLINE: 'Preparar recursos offline'
};

export const ACTIVITIES = [
  { id: 'VIDEO_CALL', label: 'Videochamada', shortLabel: 'Video', minQuality: QUALITY.GOOD },
  { id: 'STREAMING', label: 'Streaming', shortLabel: 'Streaming', minQuality: QUALITY.GOOD },
  { id: 'AUDIO_CALL', label: 'Chamada de voz', shortLabel: 'Voz', minQuality: QUALITY.MODERATE },
  { id: 'FILE_UPLOAD', label: 'Envio de arquivos', shortLabel: 'Arquivos', minQuality: QUALITY.MODERATE },
  { id: 'WEB_BROWSING', label: 'Navegacao web', shortLabel: 'Navegacao', minQuality: QUALITY.MODERATE },
  { id: 'MESSAGING', label: 'Mensagens', shortLabel: 'Mensagens', minQuality: QUALITY.UNSTABLE }
];

export const MODEL_FALLBACK_ORDER = ['model-a', 'model-b', 'model-c', 'model-d'];
