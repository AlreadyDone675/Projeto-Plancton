package com.brazcubas.apsii.repository;

import com.brazcubas.apsii.model.PredictionModel;

import java.util.List;
import java.util.Optional;

/**
 * Repositório de catálogo de modelos preditivos (fonte: data/models.json).
 */
public interface ModelRepository {
    List<PredictionModel> findAll();

    Optional<PredictionModel> findById(String modelId);
}
