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
        mockMvc.perform(get("/api/v1/forecasts/probes/6410/timeline")
                        .param("model_id", "model-a")
                        .param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.probeId").value(6410))
                .andExpect(jsonPath("$.items[0].predictedAvgRttMs").isNumber())
                .andExpect(jsonPath("$.items[0].quality").isNotEmpty());
    }
}
