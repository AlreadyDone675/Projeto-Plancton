package com.brazcubas.apsii;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class RipeAtlasLiveControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getStatusReturnsSyncConfiguration() throws Exception {
        mockMvc.perform(get("/api/v1/live/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.liveSyncEnabled").value(true))
                .andExpect(jsonPath("$.defaultMeasurementId").value(1001))
                .andExpect(jsonPath("$.monitoredProbes").isArray());
    }

    @Test
    void getLiveTelemetryReturnsValidStructure() throws Exception {
        // Probe 6410 (NIC.br) ou fallback resiliente
        mockMvc.perform(get("/api/v1/live/probes/6410"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.probeId").value(6410))
                .andExpect(jsonPath("$.avgRttMs").isNumber())
                .andExpect(jsonPath("$.packetLossPct").isNumber())
                .andExpect(jsonPath("$.quality").isString())
                .andExpect(jsonPath("$.recommendation").isString());
    }

    @Test
    void getAllCachedProbesReturnsList() throws Exception {
        mockMvc.perform(get("/api/v1/live/probes"))
                .andExpect(status().isOk());
    }

    @Test
    void refreshNowExecutesSuccessfully() throws Exception {
        mockMvc.perform(post("/api/v1/live/refresh"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.refreshedCount").isNumber());
    }
}
