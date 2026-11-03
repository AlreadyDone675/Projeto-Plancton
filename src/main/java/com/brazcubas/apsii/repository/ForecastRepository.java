package com.brazcubas.apsii.repository;

import com.brazcubas.apsii.model.Forecast;
import com.brazcubas.apsii.model.Probe;

import java.util.List;

/**
 * Repositório de previsões (fonte: data/predictions.csv).
 */
public interface ForecastRepository {
    List<Forecast> findAll();

    List<Forecast> findByModelAndProbe(String modelId, int probeId);

    List<Probe> listProbeLocations();

    List<Probe> listProbeLocations(String modelId);
}
