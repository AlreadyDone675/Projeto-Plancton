package com.brazcubas.apsii;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ApiContractTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthReturnsServiceStatus() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void timelineReturnsPredictionAndAssessment() throws Exception {
        mockMvc.perform(get("/api/v1/forecasts/probes/900001/timeline")
                        .param("model_id", "model-a")
                        .param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].predictionFor").value("2026-08-20T00:00:00Z"))
                .andExpect(jsonPath("$.items[0].predictedAvgRttMs").value(62.6))
                .andExpect(jsonPath("$.items[0].quality").value("MODERATE"));
    }
}
