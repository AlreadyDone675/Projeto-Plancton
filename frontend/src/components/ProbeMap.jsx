import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { QUALITY, QUALITY_SHORT_LABELS } from '../config/qualityRules';

const QUALITY_COLORS = {
  [QUALITY.GOOD]: '#0d9488',
  [QUALITY.MODERATE]: '#d97706',
  [QUALITY.UNSTABLE]: '#e11d48'
};

export default function ProbeMap({ probes, selectedProbeId, onSelectProbe }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-15.78, -47.92],
      zoom: 4,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    probes.forEach((item) => {
      const isSelected = item.probeId === selectedProbeId;
      const color = QUALITY_COLORS[item.assessment.quality] || '#0284c7';
      const statusLabel = QUALITY_SHORT_LABELS[item.assessment.quality];

      const marker = L.circleMarker([item.location.latitude, item.location.longitude], {
        radius: isSelected ? 10 : 7,
        fillColor: color,
        color: isSelected ? '#0f172a' : '#ffffff',
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.92
      });

      const popupHtml = `
        <div style="font-family: Inter, system-ui, sans-serif; min-width: 130px;">
          <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px;">
            ${item.city} (${item.uf})
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
            <span>Qualidade:</span>
            <strong style="color: ${color};">${item.assessment.qualityScore} (${statusLabel})</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
            <span>Ping:</span>
            <strong>${item.prediction.predictedAvgRttMs.toFixed(1)} ms</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Perda:</span>
            <strong>${item.prediction.predictedPacketLossPct.toFixed(2)}%</strong>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        if (onSelectProbe) {
          onSelectProbe(item.probeId);
        }
      });

      marker.addTo(markersLayer);
    });
  }, [probes, selectedProbeId, onSelectProbe]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedProbeId) return;
    const target = probes.find((p) => p.probeId === selectedProbeId);
    if (target) {
      map.panTo([target.location.latitude, target.location.longitude], { animate: true });
    }
  }, [selectedProbeId, probes]);

  return (
    <div className="map-wrapper">
      <div ref={mapContainerRef} className="leaflet-container-box" />
    </div>
  );
}
