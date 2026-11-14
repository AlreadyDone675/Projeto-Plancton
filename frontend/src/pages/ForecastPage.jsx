import React, { useEffect, useMemo, useState } from 'react';
import { QUALITY, QUALITY_SHORT_LABELS } from '../config/qualityRules';

function buildSvgPath(items, width, height, padding) {
  if (!items || items.length === 0) return { linePath: '', areaPath: '', points: [] };

  const rtts = items.map((i) => i.predictedAvgRttMs);
  const minVal = Math.min(...rtts);
  const maxVal = Math.max(...rtts);
  const range = Math.max(10, maxVal - minVal);

  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  const points = items.map((item, idx) => {
    const x = padding + (idx / Math.max(1, items.length - 1)) * usableW;
    const norm = (item.predictedAvgRttMs - minVal) / range;
    const y = padding + usableH - norm * usableH;
    return { x, y, item };
  });

  const linePath = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  const firstX = points[0].x.toFixed(1);
  const lastX = points[points.length - 1].x.toFixed(1);
  const bottomY = (height - padding).toFixed(1);
  const areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

  return { linePath, areaPath, points };
}

export default function ForecastPage({
  nearbyForecast,
  timelineData,
  selectedProbeId,
  onOpenSettings,
  onOpenHelp,
  onGoToAnalysis,
  currentHour = 9,
  clockDisplay,
  isLiveActive,
  isLiveSyncing,
  onRefreshLive
}) {
  const [viewDay, setViewDay] = useState('today');
  const [selectedHourIdx, setSelectedHourIdx] = useState(currentHour);

  useEffect(() => {
    setSelectedHourIdx(currentHour);
  }, [currentHour, selectedProbeId]);

  const { probeInfo } = nearbyForecast;
  const allItems = timelineData.items || [];
  const viewDayOffset = viewDay === 'tomorrow' && allItems.length >= 48 ? 24 : 0;
  const items = useMemo(
    () =>
      allItems.length >= 48
        ? allItems.slice(viewDayOffset, viewDayOffset + 24)
        : allItems.slice(0, 24),
    [allItems, viewDayOffset]
  );

  const activeSlot = items[selectedHourIdx] || items[currentHour] || items[0];

  const stats = useMemo(() => {
    if (!items.length) return { min: 0, max: 0, avg: 0 };
    const rtts = items.map((i) => i.predictedAvgRttMs);
    const min = Math.min(...rtts);
    const max = Math.max(...rtts);
    const avg = rtts.reduce((acc, v) => acc + v, 0) / rtts.length;
    return {
      min: min.toFixed(1),
      max: max.toFixed(1),
      avg: avg.toFixed(1)
    };
  }, [items]);

  const chart = useMemo(() => buildSvgPath(items, 340, 120, 14), [items]);

  const qualityClass = activeSlot ? activeSlot.quality.toLowerCase() : 'good';
  const strokeColor =
    activeSlot?.quality === QUALITY.GOOD
      ? '#0d9488'
      : activeSlot?.quality === QUALITY.MODERATE
        ? '#d97706'
        : '#e11d48';

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    circumference - ((activeSlot?.qualityScore || 0) / 100) * circumference;

  const isViewingNow = viewDay === 'today' && selectedHourIdx === currentHour;
  const viewDayLabel = viewDay === 'today' ? 'HOJE' : 'AMANHÃ';

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

      {/* Apenas a Area Reconhecida pela Localizacao */}
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
      </section>

      {/* Bloco 1: Indice de Conexao Circular */}
      <section className="primary-card">
        <div className="gauge-header-row">
          <span className="block-title">
            INDICE DE CONEXAO ·{' '}
            {isViewingNow
              ? `AGORA (${activeSlot?.hourLabel})`
              : `${viewDayLabel} · ${activeSlot?.hourLabel}`}
          </span>
          {!isViewingNow && (
            <button
              type="button"
              className="reset-now-btn"
              onClick={() => {
                setViewDay('today');
                setSelectedHourIdx(currentHour);
              }}
            >
              Voltar para Agora
            </button>
          )}
        </div>

        <div className="gauge-wrapper">
          <svg className="gauge-svg" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="10"
            />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
            />
          </svg>
          <div className="gauge-center">
            <span className="score-number">{activeSlot?.qualityScore}</span>
            <span className={`score-status text-${qualityClass}`}>
              {QUALITY_SHORT_LABELS[activeSlot?.quality]}
            </span>
          </div>
        </div>
      </section>

      {/* Bloco 2: Perda de Pacotes e Ping */}
      <section className="metrics-grid-2">
        <div className="metric-box">
          <span className="metric-label">PING</span>
          <span className="metric-big">
            {activeSlot?.predictedAvgRttMs.toFixed(1)} <small>ms</small>
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">PERDA DE PACOTES</span>
          <span className="metric-big">
            {activeSlot?.predictedPacketLossPct.toFixed(2).replace('.', ',')} <small>%</small>
          </span>
        </div>
      </section>

      {/* Bloco 3: Grafico Temporal */}
      <section className="block-section">
        <div className="chart-card">
          <div className="chart-stats-row">
            <span className="chart-stat-muted">
              MIN: {stats.min}ms | MAX: {stats.max}ms
            </span>
            <span className="chart-stat-highlight">MED: {stats.avg}ms</span>
          </div>

          <svg className="line-chart-svg" viewBox="0 0 340 120">
            <defs>
              <linearGradient id="rttAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={chart.areaPath} fill="url(#rttAreaGrad)" />
            <path
              d={chart.linePath}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {chart.points.map((pt, idx) => {
              const isSelected = idx === selectedHourIdx;
              return (
                <circle
                  key={`${viewDay}-${pt.item.hourLabel}-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 5.5 : 2.5}
                  fill={isSelected ? strokeColor : '#0284c7'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedHourIdx(idx)}
                />
              );
            })}
          </svg>

          <div className="chart-axis-row">
            <span>00:00</span>
            <span>
              {viewDay === 'today'
                ? `${String(currentHour).padStart(2, '0')}:00 (Agora)`
                : '12:00 (Amanhã)'}
            </span>
            <span>23:00</span>
          </div>
        </div>
      </section>

      {/* Linha do Tempo Horaria (RF002) */}
      <section className="block-section">
        <div className="gauge-header-row" style={{ marginBottom: '8px' }}>
          <h2 className="block-title" style={{ marginBottom: 0 }}>
            LINHA DO TEMPO HORARIA ({viewDayLabel})
          </h2>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="reset-now-btn"
              style={{
                fontWeight: viewDay === 'today' ? 700 : 500,
                opacity: viewDay === 'today' ? 1 : 0.65
              }}
              onClick={() => setViewDay('today')}
            >
              HOJE
            </button>
            <button
              type="button"
              className="reset-now-btn"
              style={{
                fontWeight: viewDay === 'tomorrow' ? 700 : 500,
                opacity: viewDay === 'tomorrow' ? 1 : 0.65
              }}
              onClick={() => setViewDay('tomorrow')}
            >
              AMANHÃ
            </button>
          </div>
        </div>

        <div className="timeline-strip">
          {items.map((slot, idx) => {
            const slotClass = slot.quality.toLowerCase();
            const isSelected = idx === selectedHourIdx;
            const isNow = viewDay === 'today' && idx === currentHour;
            return (
              <button
                key={`${viewDay}-${slot.hourLabel}-${idx}`}
                type="button"
                className={`timeline-pill ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedHourIdx(idx)}
              >
                <span className="timeline-hour">
                  {isNow ? 'Agora' : slot.hourLabel}
                </span>
                <span className={`timeline-score badge-${slotClass}`}>
                  {slot.qualityScore}
                </span>
                <span className="timeline-rtt">{slot.predictedAvgRttMs.toFixed(0)}ms</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Botao direto para a Aba 3 (Analise) */}
      <section className="block-section">
        <button
          type="button"
          className="mark-event-btn"
          onClick={onGoToAnalysis}
        >
          Criar previsão de conexão
        </button>
      </section>
    </div>
  );
}
