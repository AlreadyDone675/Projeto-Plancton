package com.brazcubas.apsii.controller;

import com.brazcubas.apsii.model.ActivityCheckRequest;
import com.brazcubas.apsii.model.ActivityCheckResponse;
import com.brazcubas.apsii.service.ActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint de verificação de adequação de atividade.
 */
@RestController
@RequestMapping("/api/v1/activity")
@Tag(name = "Activity")
public class ActivityController {
    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @Operation(summary = "Check activity suitability")
    @PostMapping("/check")
    public ActivityCheckResponse check(@Valid @RequestBody ActivityCheckRequest request) {
        return activityService.check(request);
    }
}
