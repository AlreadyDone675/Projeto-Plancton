package com.brazcubas.apsii.service;

import com.brazcubas.apsii.config.ActivityRules;
import com.brazcubas.apsii.config.ActivityRules.Activity;
import com.brazcubas.apsii.config.ActivityRules.Recommendation;
import com.brazcubas.apsii.config.QualityRules.Quality;
import com.brazcubas.apsii.model.ApiDtos;
import org.springframework.stereotype.Service;

/**
 * Gera recomendação de uso a partir da classificação de qualidade e atividade.
 */
@Service
public class RecommendationService {

    /**
     * Retorna recomendação para uma atividade dada a qualidade prevista.
     *
     * @param quality  GOOD, MODERATE ou UNSTABLE
     * @param activity uma atividade do domínio
     * @return recomendação
     */
    public Recommendation recommend(String quality, Activity activity) {
        return forActivity(activity, Quality.valueOf(quality)).recommendation().code();
    }

    public ApiDtos.Recommendation forQuality(Quality quality) {
        return switch (quality) {
            case GOOD -> new ApiDtos.Recommendation(
                    Recommendation.NORMAL_USE,
                    "A conexão prevista está adequada para atividades online neste período.");
            case MODERATE -> new ApiDtos.Recommendation(
                    Recommendation.REDUCE_NETWORK_USAGE,
                    "A conexão pode apresentar alguma instabilidade neste período.");
            case UNSTABLE -> new ApiDtos.Recommendation(
                    Recommendation.PREPARE_OFFLINE,
                    "Considere preparar recursos offline para este período.");
        };
    }

    public ActivityRecommendation forActivity(Activity activity, Quality quality) {
        boolean suitable = ActivityRules.qualityRank(quality)
                >= ActivityRules.qualityRank(ActivityRules.minimumQuality(activity));
        Recommendation code = suitable && quality == Quality.GOOD
                ? Recommendation.NORMAL_USE
                : quality == Quality.UNSTABLE
                        ? Recommendation.PREPARE_OFFLINE
                        : Recommendation.REDUCE_NETWORK_USAGE;
        return new ActivityRecommendation(suitable, new ApiDtos.Recommendation(code, activityMessage(activity, quality)));
    }

    private static String activityMessage(Activity activity, Quality quality) {
        return switch (activity) {
            case VIDEO_CALL -> switch (quality) {
                case GOOD -> "A conexão prevista está adequada para uma chamada de vídeo neste período.";
                case MODERATE -> "Uma chamada de vídeo pode sofrer oscilações neste período.";
                case UNSTABLE -> "Há risco de instabilidade para uma chamada de vídeo neste período.";
            };
            case AUDIO_CALL -> switch (quality) {
                case GOOD -> "A conexão prevista está adequada para uma chamada de áudio neste período.";
                case MODERATE -> "Uma chamada de áudio pode apresentar alguma instabilidade neste período.";
                case UNSTABLE -> "Há risco de instabilidade para uma chamada de áudio neste período.";
            };
            case STREAMING -> switch (quality) {
                case GOOD -> "A conexão prevista está adequada para streaming neste período.";
                case MODERATE -> "O streaming pode apresentar buffering neste período.";
                case UNSTABLE -> "Há risco de interrupções no streaming neste período.";
            };
            case FILE_UPLOAD -> switch (quality) {
                case GOOD -> "A conexão prevista está adequada para envio de arquivos neste período.";
                case MODERATE -> "O envio de arquivos pode ser mais lento neste período.";
                case UNSTABLE -> "Há risco de falha ou lentidão no envio de arquivos neste período.";
            };
            case WEB_BROWSING -> switch (quality) {
                case GOOD -> "A conexão prevista está adequada para navegação neste período.";
                case MODERATE -> "A navegação pode ficar mais lenta neste período.";
                case UNSTABLE -> "A navegação pode ficar instável neste período.";
            };
            case MESSAGING -> switch (quality) {
                case GOOD -> "A conexão prevista está adequada para mensagens neste período.";
                case MODERATE -> "Mensagens devem funcionar, com possível atraso neste período.";
                case UNSTABLE -> "Mensagens podem atrasar; considere não depender só da rede neste período.";
            };
        };
    }

    public record ActivityRecommendation(boolean suitable, ApiDtos.Recommendation recommendation) {}
}
