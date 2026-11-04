import { ACTIVITIES, QUALITY, RECOMMENDATION_CODES } from '../config/qualityRules';
import { qualityClassifier } from './qualityClassifier';

const ACTIVITY_MESSAGES = {
  VIDEO_CALL: {
    GOOD: 'A conexao prevista esta adequada para uma chamada de video neste periodo.',
    MODERATE: 'Uma chamada de video pode sofrer oscilacoes neste periodo.',
    UNSTABLE: 'Ha risco de instabilidade para uma chamada de video neste periodo.'
  },
  AUDIO_CALL: {
    GOOD: 'A conexao prevista esta adequada para uma chamada de audio neste periodo.',
    MODERATE: 'Uma chamada de audio pode apresentar alguma instabilidade neste periodo.',
    UNSTABLE: 'Ha risco de instabilidade para uma chamada de audio neste periodo.'
  },
  STREAMING: {
    GOOD: 'A conexao prevista esta adequada para streaming neste periodo.',
    MODERATE: 'O streaming pode apresentar buffering neste periodo.',
    UNSTABLE: 'Ha risco de interrupcoes no streaming neste periodo.'
  },
  FILE_UPLOAD: {
    GOOD: 'A conexao prevista esta adequada para envio de arquivos neste periodo.',
    MODERATE: 'O envio de arquivos pode ser mais lento neste periodo.',
    UNSTABLE: 'Ha risco de falha ou lentidao no envio de arquivos neste periodo.'
  },
  WEB_BROWSING: {
    GOOD: 'A conexao prevista esta adequada para navegacao neste periodo.',
    MODERATE: 'A navegacao pode ficar mais lenta neste periodo.',
    UNSTABLE: 'A navegacao pode ficar instavel neste periodo.'
  },
  MESSAGING: {
    GOOD: 'A conexao prevista esta adequada para mensagens neste periodo.',
    MODERATE: 'Mensagens devem funcionar, com possivel atraso neste periodo.',
    UNSTABLE: 'Mensagens podem atrasar; considere nao depender so da rede neste periodo.'
  }
};

// Espelha RecommendationService.java do backend
export const recommendationService = {
  forQuality(quality) {
    if (quality === QUALITY.GOOD) {
      return {
        code: RECOMMENDATION_CODES.NORMAL_USE,
        message: 'A conexao prevista esta adequada para atividades online neste periodo.'
      };
    }
    if (quality === QUALITY.MODERATE) {
      return {
        code: RECOMMENDATION_CODES.REDUCE_NETWORK_USAGE,
        message: 'A conexao pode apresentar alguma instabilidade neste periodo.'
      };
    }
    return {
      code: RECOMMENDATION_CODES.PREPARE_OFFLINE,
      message: 'Considere preparar recursos offline para este periodo.'
    };
  },

  forActivity(activityId, quality) {
    const activityDef = ACTIVITIES.find((a) => a.id === activityId) || ACTIVITIES[0];
    const suitable =
      qualityClassifier.rank(quality) >= qualityClassifier.rank(activityDef.minQuality);

    const code =
      suitable && quality === QUALITY.GOOD
        ? RECOMMENDATION_CODES.NORMAL_USE
        : quality === QUALITY.UNSTABLE
          ? RECOMMENDATION_CODES.PREPARE_OFFLINE
          : RECOMMENDATION_CODES.REDUCE_NETWORK_USAGE;

    const message =
      (ACTIVITY_MESSAGES[activityDef.id] && ACTIVITY_MESSAGES[activityDef.id][quality]) ||
      this.forQuality(quality).message;

    return {
      suitable,
      recommendation: { code, message }
    };
  }
};
