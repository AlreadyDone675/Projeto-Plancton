package com.brazcubas.apsii.controller;

import com.brazcubas.apsii.model.ApiDtos;
import com.brazcubas.apsii.service.ModelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints do catálogo de modelos preditivos.
 */
@RestController
@RequestMapping("/api/v1/models")
@Tag(name = "Models")
public class ModelController {
    private final ModelService modelService;

    public ModelController(ModelService modelService) {
        this.modelService = modelService;
    }

    @Operation(summary = "List models")
    @GetMapping
    public ApiDtos.ModelsResponse list() {
        return modelService.listActive();
    }

    @Operation(summary = "Get model")
    @GetMapping("/{model_id}")
    public ApiDtos.ModelDetail get(@PathVariable("model_id") String modelId) {
        return modelService.get(modelId);
    }
}
