import React, { useMemo, useState } from 'react';
import { QUALITY_SHORT_LABELS } from '../config/qualityRules';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const toRad = (deg) => (deg * Math.PI) / 180.0;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function OverviewPage({
  nearbyForecast,
  allProbes,
  anchorCoords,
  selectedProbeId,
  nearestProbeId,
  onSelectProbe,
  onReturnToNearest,
  onOpenSettings,
  onOpenHelp,
  clockDisplay,
  isLiveActive,
  isLiveSyncing,
  onRefreshLive
}) {
  const [showAllRegions, setShowAllRegions] = useState(false);
  const { probeInfo, prediction, assessment, activitiesStatus } = nearbyForecast;
  const qualityClass = assessment.quality.toLowerCase();

  // Mantem as 3 areas mais proximas da regiao reconhecida (ou todas se expandir),
  // sem remover nem alterar o tamanho da lista ao clicar em um item,
  // e ordenadas por qualidade de conexao da mais baixa para a mais alta.
  const displayedRegions = useMemo(() => {
    const refLat = anchorCoords?.latitude ?? -23.652;
    const refLon = anchorCoords?.longitude ?? -46.732;

    const withDist = allProbes.map((item) => ({
      ...item,
      distanceKm: haversineKm(refLat, refLon, item.location.latitude, item.location.longitude)
    }));

    const baseList = showAllRegions
      ? withDist
      : [...withDist]
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .filter((item) => item.distanceKm > 0.01)
          .slice(0, 3);

    return [...baseList].sort(
      (a, b) =>
        a.assessment.qualityScore - b.assessment.qualityScore ||
        b.prediction.predictedAvgRttMs - a.prediction.predictedAvgRttMs
    );
  }, [allProbes, anchorCoords, showAllRegions]);

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

      {/* Apenas a Area Reconhecida / Selecionada + Botao para retornar a area mais proxima */}
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
        {selectedProbeId !== nearestProbeId && (
          <button
            type="button"
            className="reset-now-btn"
            onClick={onReturnToNearest}
          >
            Área mais próxima
          </button>
        )}
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

      {/* 3 Areas Mais Proximas (ou Todas as Regioes), lista fixa sem mudar de tamanho ao clicar */}
      <section className="block-section">
        <div className="gauge-header-row" style={{ marginBottom: '8px' }}>
          <h2 className="block-title" style={{ marginBottom: 0 }}>
            {showAllRegions ? 'TODAS AS REGIOES' : 'AREAS PROXIMAS'}
          </h2>
          <button
            type="button"
            className="reset-now-btn"
            onClick={() => setShowAllRegions((prev) => !prev)}
          >
            {showAllRegions ? 'Ver apenas proximas' : 'Ver todas regioes'}
          </button>
        </div>

        <div className="suggested-list">
          {displayedRegions.map((item) => {
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
                  <span
                    className="suggested-meta"
                    title="% perca de pacotes"
                    data-tooltip="% perca de pacotes"
                  >
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
