package com.brazcubas.apsii.service;

import com.brazcubas.apsii.config.ApiException;
import com.brazcubas.apsii.model.ApiDtos;
import com.brazcubas.apsii.model.Probe;
import com.brazcubas.apsii.repository.ForecastRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class LocationService {
    private static final double EARTH_RADIUS_KM = 6371.0;

    private final ForecastRepository repository;

    public LocationService(ForecastRepository repository) {
        this.repository = repository;
    }

    public ApiDtos.LocationsResponse listLocations() {
        List<ApiDtos.LocationItem> items = repository.listProbeLocations().stream()
                .sorted(Comparator.comparingInt(Probe::probeId))
                .map(probe -> new ApiDtos.LocationItem(
                        probe.probeId(), probe.countryCode(), probe.asnV4(), probe.asnV6(),
                        new ApiDtos.GeoPoint(probe.latitude(), probe.longitude())))
                .toList();
        return new ApiDtos.LocationsResponse(items, items.size());
    }

    public NearestProbe findNearest(double latitude, double longitude, Double radiusKm, String modelId) {
        List<Probe> probes = modelId == null
                ? repository.listProbeLocations()
                : repository.listProbeLocations(modelId);
        Probe nearest = probes.stream()
                .min(Comparator.comparingDouble(probe -> haversineKm(
                        latitude, longitude, probe.latitude(), probe.longitude())))
                .orElseThrow(() -> noProbeInRange());
        double distance = haversineKm(latitude, longitude, nearest.latitude(), nearest.longitude());
        if (radiusKm != null && distance > radiusKm) {
            throw noProbeInRange();
        }
        return new NearestProbe(nearest, Math.round(distance * 10.0) / 10.0);
    }

    private static double haversineKm(double latitude1, double longitude1, double latitude2, double longitude2) {
        double phi1 = Math.toRadians(latitude1);
        double phi2 = Math.toRadians(latitude2);
        double deltaPhi = Math.toRadians(latitude2 - latitude1);
        double deltaLambda = Math.toRadians(longitude2 - longitude1);
        double a = Math.pow(Math.sin(deltaPhi / 2.0), 2)
                + Math.cos(phi1) * Math.cos(phi2) * Math.pow(Math.sin(deltaLambda / 2.0), 2);
        double boundedA = Math.min(1.0, Math.max(0.0, a));
        return 2.0 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(boundedA));
    }

    private static ApiException noProbeInRange() {
        return new ApiException(
                404,
                "NO_PROBE_IN_RANGE",
                "No probe with prediction data was found within the requested radius.");
    }

    public record NearestProbe(Probe probe, double distanceKm) {}
}
