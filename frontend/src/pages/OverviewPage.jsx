import React from 'react';
import { QUALITY_SHORT_LABELS } from '../config/qualityRules';

export default function OverviewPage({
  nearbyForecast,
  allProbes,
  selectedProbeId,
  onSelectProbe,
  onOpenSettings,
  clockDisplay,
  isLiveActive,
  isLiveSyncing,
  onRefreshLive
}) {
  const { probeInfo, prediction, assessment, activitiesStatus } = nearbyForecast;
  const qualityClass = assessment.quality.toLowerCase();

  return (
    <div className="screen-content">
      {/* Cabecalho Minimalista Padronizado */}
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

      {/* Localizacao Atual */}
      <section className="region-row">
        <div className="region-title-group">
          <svg
            className="pin-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M12 21s-7-5.686-7-11a7 7 0 1 1 14 0c0 5.314-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <h1 className="region-title">{probeInfo.displayName}</h1>
        </div>

        <select
          aria-label="Selecionar estado"
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

      {/* Card Principal: Qualidade (0 a 100), Ping e Perda */}
      <section className="primary-card">
        <div className="score-hero">
          <div className={`score-circle score-${qualityClass}`}>
            <span className="score-number">{assessment.qualityScore}</span>
            <span className="score-status">{QUALITY_SHORT_LABELS[assessment.quality]}</span>
          </div>
        </div>

        <div className="metrics-grid-2">
          <div className="metric-box">
            <span className="metric-label">PING</span>
            <span className="metric-big">
              {prediction.predictedAvgRttMs.toFixed(1)} <small>ms</small>
            </span>
          </div>

          <div className="metric-box">
            <span className="metric-label">PERDA DE PACOTES</span>
            <span className="metric-big">
              {prediction.predictedPacketLossPct.toFixed(2).replace('.', ',')} <small>%</small>
            </span>
          </div>
        </div>
      </section>

      {/* O que e possivel fazer com essa qualidade da rede */}
      <section className="block-section">
        <h2 className="block-title">O QUE E POSSIVEL FAZER AGORA</h2>
        <div className="activities-grid">
          {activitiesStatus.map((act) => (
            <div
              key={act.id}
              className={`activity-chip ${act.suitable ? 'chip-ok' : 'chip-warn'}`}
            >
              <span className="activity-name">{act.label}</span>
              <span className="activity-state">
                {act.suitable ? 'Recomendado' : 'Instavel'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Conexoes por Estado */}
      <section className="block-section">
        <h2 className="block-title">OUTRAS REGIOES</h2>
        <div className="suggested-list">
          {allProbes.map((item) => {
            const itemQualityClass = item.assessment.quality.toLowerCase();
            const isCurrent = item.probeId === selectedProbeId;
            return (
              <button
                key={item.probeId}
                type="button"
                className={`suggested-card ${isCurrent ? 'selected' : ''}`}
                onClick={() => onSelectProbe(item.probeId)}
              >
                <div className="suggested-left">
                  <div className="suggested-title-row">
                    <span className="uf-pill">{item.uf}</span>
                    <span className="suggested-city">{item.city}</span>
                    <span className={`status-badge badge-${itemQualityClass}`}>
                      {item.assessment.qualityScore}
                    </span>
                  </div>
                </div>

                <div className="suggested-right">
                  <span className="suggested-rtt">
                    {item.prediction.predictedAvgRttMs.toFixed(1)} ms
                  </span>
                  <span className="suggested-meta">
                    {item.prediction.predictedPacketLossPct.toFixed(2).replace('.', ',')}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
