package com.brazcubas.apsii.controller;

import com.brazcubas.apsii.model.ApiDtos;
import com.brazcubas.apsii.service.LocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/locations")
@Tag(name = "Locations")
public class LocationsController {
    private final LocationService locationService;

    public LocationsController(LocationService locationService) {
        this.locationService = locationService;
    }

    @Operation(summary = "List probe locations")
    @GetMapping
    public ApiDtos.LocationsResponse list() {
        return locationService.listLocations();
    }
}
