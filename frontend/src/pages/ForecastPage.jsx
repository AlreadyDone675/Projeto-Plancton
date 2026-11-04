import React, { useEffect, useMemo, useState } from 'react';
import { ACTIVITIES, QUALITY, QUALITY_SHORT_LABELS } from '../config/qualityRules';
import { forecastService } from '../service/forecastService';

const DAY_OPTIONS = [
  { id: 'today', label: 'Hoje' },
  { id: 'tomorrow', label: 'Amanha' },
  { id: 'after', label: 'Em 2 dias' }
];

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
  allProbes,
  selectedProbeId,
  onSelectProbe,
  onOpenSettings,
  currentHour = 9,
  clockDisplay,
  isLiveActive,
  isLiveSyncing,
  onRefreshLive
}) {
  // Inicia e mantem sincronizado no mesmo horario atual da Tela 1
  const [selectedHourIdx, setSelectedHourIdx] = useState(currentHour);

  useEffect(() => {
    setSelectedHourIdx(currentHour);
  }, [currentHour, selectedProbeId]);

  // Opcao de marcar evento contida por padrao, abrindo apenas se o usuario quiser
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [eventDay, setEventDay] = useState('tomorrow');
  const [eventHourIdx, setEventHourIdx] = useState(18);
  const [eventActivity, setEventActivity] = useState('VIDEO_CALL');
  const [markedEvents, setMarkedEvents] = useState([]);

  const { probeInfo } = nearbyForecast;
  const items = timelineData.items || [];
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

  const currentEventCheck = useMemo(
    () =>
      forecastService.checkActivity({
        probeId: selectedProbeId,
        hour: eventHourIdx,
        activity: eventActivity,
        referenceHour: currentHour
      }),
    [selectedProbeId, eventHourIdx, eventActivity, currentHour, items]
  );

  const markedHoursSet = useMemo(
    () => new Set(markedEvents.map((e) => e.hourIdx)),
    [markedEvents]
  );

  const handleAddEvent = () => {
    const dayObj = DAY_OPTIONS.find((d) => d.id === eventDay) || DAY_OPTIONS[1];
    const newId = `evt-${Date.now()}`;
    setMarkedEvents((prev) => [
      {
        id: newId,
        dayId: dayObj.id,
        dayLabel: dayObj.label,
        hourIdx: eventHourIdx,
        activityId: eventActivity
      },
      ...prev.filter(
        (e) =>
          !(
            e.dayId === dayObj.id &&
            e.hourIdx === eventHourIdx &&
            e.activityId === eventActivity
          )
      )
    ]);
  };

  const handleRemoveEvent = (id) => {
    setMarkedEvents((prev) => prev.filter((e) => e.id !== id));
  };

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

  const selectedActivityLabel =
    ACTIVITIES.find((a) => a.id === eventActivity)?.label || 'Atividade';
  const selectedDayLabel =
    DAY_OPTIONS.find((d) => d.id === eventDay)?.label || 'Amanha';
  const eventHourStr = `${String(eventHourIdx).padStart(2, '0')}:00`;

  const isViewingNow = selectedHourIdx === currentHour;

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

      {/* Seletor de Regiao */}
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

      {/* Bloco 1: Indice de Conexao Circular (Alinhado ao Horario Atual por padrao) */}
      <section className="primary-card">
        <div className="gauge-header-row">
          <span className="block-title">
            INDICE DE CONEXAO · {isViewingNow ? `AGORA (${activeSlot.hourLabel})` : activeSlot.hourLabel}
          </span>
          {!isViewingNow && (
            <button
              type="button"
              className="reset-now-btn"
              onClick={() => setSelectedHourIdx(currentHour)}
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
            <span className="score-number">{activeSlot.qualityScore}</span>
            <span className={`score-status text-${qualityClass}`}>
              {QUALITY_SHORT_LABELS[activeSlot.quality]}
            </span>
          </div>
        </div>
      </section>

      {/* Bloco 2: Perda de Pacotes e Ping */}
      <section className="metrics-grid-2">
        <div className="metric-box">
          <span className="metric-label">PING</span>
          <span className="metric-big">
            {activeSlot.predictedAvgRttMs.toFixed(1)} <small>ms</small>
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">PERDA DE PACOTES</span>
          <span className="metric-big">
            {activeSlot.predictedPacketLossPct.toFixed(2).replace('.', ',')} <small>%</small>
          </span>
        </div>
      </section>

      {/* Bloco 3: Intervalo de Latencia e Linha do Tempo 24h (RF002) */}
      <section className="block-section">
        <h2 className="block-title">INTERVALO DE LATENCIA (24H)</h2>

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
              const isMarked = markedHoursSet.has(idx);
              return (
                <circle
                  key={pt.item.hourLabel}
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 5.5 : isMarked ? 4.5 : 2.5}
                  fill={isSelected ? strokeColor : isMarked ? '#0f172a' : '#0284c7'}
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
            <span>{String(currentHour).padStart(2, '0')}:00 (Agora)</span>
            <span>23:00</span>
          </div>
        </div>
      </section>

      {/* Linha do Tempo Horaria (RF002) */}
      <section className="block-section">
        <h2 className="block-title">LINHA DO TEMPO HORARIA</h2>
        <div className="timeline-strip">
          {items.map((slot, idx) => {
            const slotClass = slot.quality.toLowerCase();
            const isSelected = idx === selectedHourIdx;
            const isNow = idx === currentHour;
            const isMarked = markedHoursSet.has(idx);
            return (
              <button
                key={slot.hourLabel}
                type="button"
                className={`timeline-pill ${isSelected ? 'active' : ''} ${
                  isMarked ? 'marked' : ''
                }`}
                onClick={() => setSelectedHourIdx(idx)}
              >
                <span className="timeline-hour">
                  {isNow ? 'Agora' : slot.hourLabel}
                  {isMarked ? ' *' : ''}
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

      {/* Bloco 4: Marcar Evento Contido (Expande apenas quando o usuario clica) */}
      <section className="block-section">
        <button
          type="button"
          className={`collapsible-trigger ${plannerOpen ? 'open' : ''}`}
          onClick={() => setPlannerOpen((prev) => !prev)}
        >
          <span>Marcar evento para consultar previsao</span>
          <span className="collapsible-chevron">{plannerOpen ? 'Fechar' : 'Abrir'}</span>
        </button>

        {plannerOpen && (
          <div className="event-planner-card">
            <div className="planner-row-3">
              <div className="planner-field">
                <label className="planner-label" htmlFor="evt-day">
                  Dia
                </label>
                <select
                  id="evt-day"
                  className="planner-select"
                  value={eventDay}
                  onChange={(e) => setEventDay(e.target.value)}
                >
                  {DAY_OPTIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="planner-field">
                <label className="planner-label" htmlFor="evt-hour">
                  Horario
                </label>
                <select
                  id="evt-hour"
                  className="planner-select"
                  value={eventHourIdx}
                  onChange={(e) => setEventHourIdx(Number(e.target.value))}
                >
                  {items.map((slot, idx) => (
                    <option key={slot.hourLabel} value={idx}>
                      {slot.hourLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="planner-field">
                <label className="planner-label" htmlFor="evt-act">
                  Atividade
                </label>
                <select
                  id="evt-act"
                  className="planner-select"
                  value={eventActivity}
                  onChange={(e) => setEventActivity(e.target.value)}
                >
                  {ACTIVITIES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className={`event-preview-box ${
                currentEventCheck.suitable ? 'preview-ok' : 'preview-warn'
              }`}
            >
              <div className="event-preview-top">
                <span className="event-preview-title">
                  {selectedActivityLabel} · {selectedDayLabel} as {eventHourStr}
                </span>
                <span className="event-preview-badge">
                  {currentEventCheck.forecast.qualityScore} pts ·{' '}
                  {currentEventCheck.suitable ? 'Recomendado' : 'Instavel'}
                </span>
              </div>
              <p className="event-preview-msg">{currentEventCheck.recommendation.message}</p>
            </div>

            <button type="button" className="mark-event-btn" onClick={handleAddEvent}>
              Salvar evento na linha do tempo
            </button>
          </div>
        )}

        {markedEvents.length > 0 && (
          <div className="marked-events-list">
            {markedEvents.map((evt) => {
              const evtCheck = forecastService.checkActivity({
                probeId: selectedProbeId,
                hour: evt.hourIdx,
                activity: evt.activityId,
                referenceHour: currentHour
              });
              const actName =
                ACTIVITIES.find((a) => a.id === evt.activityId)?.label || evt.activityId;
              const hourStr = `${String(evt.hourIdx).padStart(2, '0')}:00`;

              return (
                <div
                  key={evt.id}
                  className={`marked-event-item ${
                    evt.hourIdx === selectedHourIdx ? 'active' : ''
                  }`}
                  onClick={() => setSelectedHourIdx(evt.hourIdx)}
                >
                  <div className="marked-event-info">
                    <span className="marked-time">
                      {evt.dayLabel} · {hourStr}
                    </span>
                    <span className="marked-act">{actName}</span>
                  </div>

                  <div className="marked-event-right">
                    <span
                      className={`status-badge ${
                        evtCheck.suitable ? 'badge-good' : 'badge-unstable'
                      }`}
                    >
                      {evtCheck.forecast.qualityScore} ·{' '}
                      {evtCheck.suitable ? 'Recomendado' : 'Instavel'}
                    </span>
                    <button
                      type="button"
                      className="remove-evt-btn"
                      aria-label="Remover evento"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveEvent(evt.id);
                      }}
                    >
                      x
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
