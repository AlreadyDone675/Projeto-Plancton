package com.brazcubas.apsii.config;

import com.brazcubas.apsii.config.QualityRules.Quality;

import java.util.Set;

/**
 * Atividades suportadas e recomendações possíveis.
 */
public final class ActivityRules {
    private ActivityRules() {}

    public enum Activity { VIDEO_CALL, AUDIO_CALL, STREAMING, FILE_UPLOAD, WEB_BROWSING, MESSAGING }
    public enum Recommendation { NORMAL_USE, REDUCE_NETWORK_USAGE, PREPARE_OFFLINE }

    public static final Set<Activity> ALL_ACTIVITIES = Set.of(Activity.values());

    public static Quality minimumQuality(Activity activity) {
        return switch (activity) {
            case VIDEO_CALL, STREAMING -> Quality.GOOD;
            case AUDIO_CALL, FILE_UPLOAD, WEB_BROWSING -> Quality.MODERATE;
            case MESSAGING -> Quality.UNSTABLE;
        };
    }

    public static int qualityRank(Quality quality) {
        return switch (quality) {
            case UNSTABLE -> 0;
            case MODERATE -> 1;
            case GOOD -> 2;
        };
    }
}
