package com.brazcubas.apsii.service;

import com.brazcubas.apsii.config.ApiException;
import com.brazcubas.apsii.model.ApiDtos;
import com.brazcubas.apsii.model.PredictionModel;
import com.brazcubas.apsii.repository.ModelRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class ModelService {
    private final ModelRepository repository;

    public ModelService(ModelRepository repository) {
        this.repository = repository;
    }

    public ApiDtos.ModelsResponse listActive() {
        List<ApiDtos.ModelListItem> items = listActiveModels().stream()
                .map(ModelService::toListItem)
                .toList();
        return new ApiDtos.ModelsResponse(items, items.size());
    }

    public ApiDtos.ModelDetail get(String modelId) {
        PredictionModel model = repository.findById(modelId)
                .orElseThrow(() -> new ApiException(404, "MODEL_NOT_FOUND", "The requested prediction model was not found."));
        return new ApiDtos.ModelDetail(
                model.id(), model.name(), model.description(), model.groupName(),
                model.algorithm(), model.version(), model.active());
    }

    public PredictionModel requireActive(String modelId) {
        PredictionModel model = repository.findById(modelId)
                .orElseThrow(() -> new ApiException(404, "MODEL_NOT_FOUND", "The requested prediction model was not found."));
        if (!model.active()) {
            throw new ApiException(404, "MODEL_INACTIVE", "The requested prediction model is not active.");
        }
        return model;
    }

    public List<PredictionModel> listActiveModels() {
        return repository.findAll().stream()
                .filter(PredictionModel::active)
                .sorted(Comparator.comparing(PredictionModel::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    public static ApiDtos.ModelListItem toListItem(PredictionModel model) {
        return new ApiDtos.ModelListItem(
                model.id(), model.name(), model.description(), model.groupName(), model.algorithm(), model.version());
    }
}
