package com.brazcubas.apsii.service;

import com.brazcubas.apsii.config.ApiException;
import com.brazcubas.apsii.config.DateTimeUtils;
import com.brazcubas.apsii.model.ActivityCheckRequest;
import com.brazcubas.apsii.model.ActivityCheckResponse;
import com.brazcubas.apsii.model.ApiDtos;
import com.brazcubas.apsii.model.Forecast;
import com.brazcubas.apsii.model.PredictionModel;
import org.springframework.stereotype.Service;

import java.time.DateTimeException;

/**
 * Serviço de verificação de adequação de atividade.
 */
@Service
public class ActivityService {
    private final LocationService locationService;
    private final ForecastService forecastService;
    private final QualityClassifier classifier;
    private final RecommendationService recommendationService;

    public ActivityService(
            LocationService locationService,
            ForecastService forecastService,
            QualityClassifier classifier,
            RecommendationService recommendationService) {
        this.locationService = locationService;
        this.forecastService = forecastService;
        this.classifier = classifier;
        this.recommendationService = recommendationService;
    }

    public ActivityCheckResponse check(ActivityCheckRequest request) {
        PredictionModel model = forecastService.requireActiveModel(request.modelId());
        LocationService.NearestProbe nearest = locationService.findNearest(
                request.latitude(), request.longitude(), null, model.id());
        Forecast forecast;
        try {
            forecast = forecastService.selectClosestRecord(
                    model.id(), nearest.probe().probeId(), DateTimeUtils.parseUtc(request.dateTime()));
        } catch (DateTimeException exception) {
            throw ApiException.validation("dateTime", "must be an ISO-8601 timestamp");
        }
        QualityClassifier.QualityAssessment assessment = classifier.assess(
                forecast.predictedAvgRttMs(), forecast.predictedPacketLossPct());
        RecommendationService.ActivityRecommendation recommendation = recommendationService.forActivity(
                request.activity(), assessment.quality());
        return new ActivityCheckResponse(
                new ApiDtos.ModelReference(model.id(), model.name(), model.version()),
                request.activity(),
                recommendation.suitable(),
                new ApiDtos.ActivityForecast(
                        assessment.quality(), forecast.predictedAvgRttMs(), forecast.predictedPacketLossPct()),
                recommendation.recommendation(),
                forecastService.referenceMetadata());
    }
}
