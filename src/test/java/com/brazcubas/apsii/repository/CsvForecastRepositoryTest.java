package com.brazcubas.apsii.repository;

import com.brazcubas.apsii.model.Forecast;
import com.brazcubas.apsii.model.PredictionModel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.DefaultResourceLoader;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CsvForecastRepositoryTest {
    @Mock
    private ModelRepository repository;

    @Test
    void loadsValidModelConfidenceAndDiscardsInvalidRows() {
        when(repository.findAll()).thenReturn(List.of(
                model("model-a", "Modelo A", true),
                model("model-b", "Modelo B", true)));

        CsvForecastRepository forecastRepository = new CsvForecastRepository(
                new DefaultResourceLoader(),
                repository,
                "classpath:data-test/predictions-11-2.csv");

        forecastRepository.load();

        List<Forecast> all = forecastRepository.findAll();
        assertEquals(5, all.size());
        assertEquals(
                List.of("mock-a-1", "mock-a-2", "mock-a-3", "mock-a-4", "mock-b-1"),
                all.stream().map(Forecast::predictionId).toList());

        List<Forecast> timeline = forecastRepository.findByModelAndProbe("model-a", 900001);
        assertEquals(4, timeline.size());
        assertEquals(
                List.of("mock-a-1", "mock-a-2", "mock-a-3", "mock-a-4"),
                timeline.stream().map(Forecast::predictionId).toList());

        assertEquals(0.82, timeline.get(0).modelConfidence());
        assertNull(timeline.get(1).modelConfidence());
        assertEquals(0.0, timeline.get(2).modelConfidence());
        assertEquals(1.0, timeline.get(3).modelConfidence());
        assertEquals(
                Arrays.asList(0.82, null, 0.0, 1.0),
                timeline.stream().map(Forecast::modelConfidence).toList());

        verify(repository).findAll();
    }

    private static PredictionModel model(String id, String name, boolean active) {
        return new PredictionModel(id, name, "Descrição de exemplo", "Grupo", "Teste", "1.0", active, null);
    }
}
