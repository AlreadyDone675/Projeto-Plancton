import React from 'react';
import ProbeMap from '../components/ProbeMap';
import { QUALITY_SHORT_LABELS } from '../config/qualityRules';

export default function MapPage({
  nearbyForecast,
  allProbes,
  selectedProbeId,
  onSelectProbe,
  onOpenSettings,
  onOpenHelp,
  clockDisplay,
  isLiveActive,
  isLiveSyncing,
  onRefreshLive
}) {
  const { probeInfo, prediction, assessment } = nearbyForecast;
  const qualityClass = assessment.quality.toLowerCase();

  return (
    <div className="screen-content">
      <header className="top-header">
        <div className="brand-title">ConnectTech</div>
        <div className="header-actions">
          <button
            type="button"
            className="clock-pill clock-pill-btn"
            title="Atualizar dados em tempo real"
            onClick={onRefreshLive}
            disabled={isLiveSyncing}
          >
            {isLiveActive && <span className="live-dot" />}
            <span>{isLiveSyncing ? 'Atualizando...' : `Agora · ${clockDisplay}`}</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="O que significam Ping e Perca de Pacotes"
            title="Entenda o que significam Ping e Perca de Pacotes"
            onClick={onOpenHelp}
          >
            <span className="help-q-mark">?</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Abrir configuracoes"
            onClick={onOpenSettings}
          >
            <svg
              className="gear-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <section className="region-row">
        <h1 className="region-title">Mapa de Conexoes</h1>
        <select
          aria-label="Selecionar estado no mapa"
          className="region-select"
          value={selectedProbeId}
          onChange={(e) => onSelectProbe(Number(e.target.value))}
        >
          {allProbes.map((p) => (
            <option key={p.probeId} value={p.probeId}>
              {p.uf} - {p.city}
            </option>
          ))}
        </select>
      </section>

      <ProbeMap
        probes={allProbes}
        selectedProbeId={selectedProbeId}
        onSelectProbe={onSelectProbe}
      />

      <section className="suggested-card selected">
        <div className="suggested-left">
          <div className="suggested-title-row">
            <span className="uf-pill">{probeInfo.uf}</span>
            <span className="suggested-city">{probeInfo.city}</span>
            <span className={`status-badge badge-${qualityClass}`}>
              {assessment.qualityScore} · {QUALITY_SHORT_LABELS[assessment.quality]}
            </span>
          </div>
        </div>
        <div className="suggested-right">
          <span className="suggested-rtt">
            {prediction.predictedAvgRttMs.toFixed(1)} ms
          </span>
          <span
            className="suggested-meta"
            title="% perca de pacotes"
            data-tooltip="% perca de pacotes"
          >
            {prediction.predictedPacketLossPct.toFixed(2).replace('.', ',')}%
          </span>
        </div>
      </section>
    </div>
  );
}
