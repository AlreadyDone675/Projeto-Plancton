package com.brazcubas.apsii.service;

import com.brazcubas.apsii.model.ApiDtos;
import com.brazcubas.apsii.model.PredictionModel;
import com.brazcubas.apsii.repository.ModelRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ModelServiceTest {
    @Mock
    private ModelRepository repository;

    @InjectMocks
    private ModelService service;

    @Test
    void listActiveModelsExcludesInactiveAndSortsByName() {
        when(repository.findAll()).thenReturn(List.of(
                model("model-b", "Modelo B", true),
                model("model-inactive", "Modelo Inativo", false),
                model("model-a", "Modelo A", true)));

        ApiDtos.ModelsResponse response = service.listActive();

        assertEquals(2, response.total());
        assertEquals(List.of("model-a", "model-b"),
                response.items().stream().map(ApiDtos.ModelListItem::id).toList());
        verify(repository).findAll();
    }

    private static PredictionModel model(String id, String name, boolean active) {
        return new PredictionModel(id, name, "Descrição de exemplo", "Grupo", "Teste", "1.0", active, null);
    }
}
