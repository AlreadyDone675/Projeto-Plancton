package com.brazcubas.apsii.repository;

import com.brazcubas.apsii.config.DateTimeUtils;
import com.brazcubas.apsii.model.PredictionModel;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class JsonModelRepository implements ModelRepository {
    private static final Logger logger = LoggerFactory.getLogger(JsonModelRepository.class);

    private final Resource resource;
    private final ObjectMapper objectMapper;
    private Map<String, PredictionModel> models = Map.of();

    public JsonModelRepository(
            ResourceLoader resourceLoader,
            ObjectMapper objectMapper,
            @Value("${api.models-file:classpath:data/models.json}") String modelsFile) {
        this.resource = resourceLoader.getResource(modelsFile);
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void load() {
        if (!resource.exists()) {
            throw new IllegalStateException("The prediction model catalog was not found.");
        }
        try {
            JsonNode root = objectMapper.readTree(resource.getInputStream());
            if (!root.isArray() || root.isEmpty()) {
                throw new IllegalStateException("The prediction model catalog is empty or invalid.");
            }
            Map<String, PredictionModel> loaded = new LinkedHashMap<>();
            for (JsonNode item : root) {
                try {
                    PredictionModel model = parse(item);
                    loaded.put(model.id(), model);
                } catch (RuntimeException exception) {
                    logger.warn("Skipping invalid model catalog entry: {}", exception.getMessage());
                }
            }
            if (loaded.isEmpty()) {
                throw new IllegalStateException("The prediction model catalog has no valid entries.");
            }
            models = Map.copyOf(loaded);
            logger.info("Loaded {} prediction models", models.size());
        } catch (IOException exception) {
            throw new IllegalStateException("The prediction model catalog could not be read.", exception);
        }
    }

    @Override
    public List<PredictionModel> findAll() {
        return List.copyOf(models.values());
    }

    @Override
    public Optional<PredictionModel> findById(String modelId) {
        return Optional.ofNullable(models.get(modelId));
    }

    private static PredictionModel parse(JsonNode item) {
        String id = requiredText(item, "id");
        String name = requiredText(item, "name");
        String description = requiredText(item, "description");
        String groupName = requiredText(item, "groupName");
        String algorithm = requiredText(item, "algorithm");
        String version = requiredText(item, "version");
        boolean active = !item.has("active") || item.get("active").asBoolean(true);
        Instant createdAt = item.hasNonNull("createdAt") ? DateTimeUtils.parseUtc(item.get("createdAt").asText()) : null;
        return new PredictionModel(id, name, description, groupName, algorithm, version, active, createdAt);
    }

    private static String requiredText(JsonNode item, String field) {
        JsonNode value = item.get(field);
        if (value == null || !value.isTextual() || value.asText().isBlank()) {
            throw new IllegalArgumentException("missing or invalid " + field);
        }
        return value.asText().trim();
    }
}
