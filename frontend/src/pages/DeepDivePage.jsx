import React, { useEffect, useMemo, useState } from 'react';
import { ACTIVITIES, QUALITY_SHORT_LABELS } from '../config/qualityRules';
import { forecastService } from '../service/forecastService';

const DATE_OPTIONS = [
  { id: 'today', label: 'Data: Hoje' },
  { id: 'tomorrow', label: 'Data: Amanha' },
  { id: 'after', label: 'Data: Em 2 dias' }
];

function ActivityIcon({ id }) {
  switch (id) {
    case 'AUDIO_CALL':
      return (
        <svg className="pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      );
    case 'VIDEO_CALL':
      return (
        <svg className="pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      );
    case 'WEB_BROWSING':
      return (
        <svg className="pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case 'STREAMING':
      return (
        <svg className="pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      );
    case 'FILE_UPLOAD':
      return (
        <svg className="pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      );
    default:
      return (
        <svg className="pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
  }
}

export default function DeepDivePage({
  allProbes,
  selectedProbeId,
  onSelectProbe,
  onOpenSettings,
  currentHour = 17,
  clockDisplay,
  dataVersion = 0,
  isLiveActive,
  isLiveSyncing,
  onRefreshLive
}) {
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedHour, setSelectedHour] = useState(currentHour);
  const [selectedActivity, setSelectedActivity] = useState('VIDEO_CALL');

  useEffect(() => {
    setSelectedHour(currentHour);
  }, [currentHour, selectedProbeId]);

  const activityResult = useMemo(
    () =>
      forecastService.checkActivity({
        probeId: selectedProbeId,
        hour: selectedHour,
        activity: selectedActivity,
        referenceHour: currentHour
      }),
    [selectedProbeId, selectedHour, selectedActivity, currentHour, dataVersion]
  );

  const { probeInfo, suitable, forecast, recommendation } = activityResult;
  const qualityClass = forecast.quality.toLowerCase();
  const stabilityPct = Number((100 - forecast.predictedPacketLossPct).toFixed(2));
  const activityDef =
    ACTIVITIES.find((a) => a.id === selectedActivity) || ACTIVITIES[0];

  const hoursList = useMemo(
    () => Array.from({ length: 24 }, (_, idx) => idx),
    []
  );

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

      <h1 className="region-title">Previsao de Conexao</h1>

      {/* Bloco 1: Filtros de Localizacao, Data/Horario e Atividade (Prototipo 3) */}
      <section className="filter-card">
        {/* Seletor de Localizacao */}
        <div className="input-box">
          <svg
            className="input-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 21s-7-5.686-7-11a7 7 0 1 1 14 0c0 5.314-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <select
            aria-label="Selecionar localizacao"
            className="full-select"
            value={selectedProbeId}
            onChange={(e) => onSelectProbe(Number(e.target.value))}
          >
            {allProbes.map((p) => (
              <option key={p.probeId} value={p.probeId}>
                {p.uf} - {p.city}
              </option>
            ))}
          </select>
        </div>

        {/* Seletor de Data e Horario */}
        <div className="date-time-grid">
          <div className="input-box">
            <svg
              className="input-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <select
              aria-label="Selecionar data de previsao"
              className="full-select"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              {DATE_OPTIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="input-box">
            <select
              aria-label="Selecionar horario de previsao"
              className="full-select"
              value={selectedHour}
              onChange={(e) => setSelectedHour(Number(e.target.value))}
            >
              {hoursList.map((h) => {
                const label = `${String(h).padStart(2, '0')}:00`;
                return (
                  <option key={h} value={h}>
                    {h === currentHour ? `${label} (Agora)` : label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Botoes de Atividade em 2 colunas para acomodar Fonte Grande sem sair da caixa */}
        <div className="activity-pills-grid">
          {ACTIVITIES.map((act) => {
            const isActive = act.id === selectedActivity;
            return (
              <button
                key={act.id}
                type="button"
                className={`activity-pill-btn ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedActivity(act.id)}
              >
                <ActivityIcon id={act.id} />
                <span>{act.shortLabel.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Bloco 2: Modelo de Conexao Detalhado (Prototipo 3 + RF003) */}
      <section className="block-section">
        <h2 className="block-title">MODELO DE CONEXAO DETALHADO</h2>

        <div className="detail-model-card">
          <div className="detail-top-row">
            <div className="detail-location-col">
              <div className="detail-city">{probeInfo.displayName}</div>
              <div className="detail-sub">
                {activityDef.label} as {forecast.hourLabel} ·{' '}
                <strong className={suitable ? 'text-good' : 'text-unstable'}>
                  {suitable ? 'Recomendado' : 'Nao recomendado'}
                </strong>
              </div>
            </div>

            <div className="detail-score-col">
              <span className={`detail-score-num text-${qualityClass}`}>
                {forecast.qualityScore}
              </span>
              <span className={`detail-score-label text-${qualityClass}`}>
                {QUALITY_SHORT_LABELS[forecast.quality]}
              </span>
            </div>
          </div>

          <div className="detail-divider" />

          <div className="detail-metrics-3">
            <div className="detail-metric-item">
              <span className="detail-metric-label">PERDA PREVISIVEL</span>
              <span className={`detail-metric-val text-${qualityClass}`}>
                {forecast.predictedPacketLossPct.toFixed(2).replace('.', ',')} %
              </span>
            </div>

            <div className="detail-metric-item">
              <span className="detail-metric-label">PING PREVISTO</span>
              <span className="detail-metric-val">
                {forecast.predictedAvgRttMs.toFixed(1).replace('.', ',')} ms
              </span>
            </div>

            <div className="detail-metric-item">
              <span className="detail-metric-label">ESTABILIDADE</span>
              <span className="detail-metric-val text-primary">
                {stabilityPct.toFixed(1).replace('.', ',')}%
              </span>
            </div>
          </div>

          <div
            className={`event-preview-box ${
              suitable ? 'preview-ok' : 'preview-warn'
            }`}
          >
            <p className="event-preview-msg">{recommendation.message}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
