import React from 'react';

export default function BottomNav({ activeTab, onChangeTab }) {
  return (
    <nav className="bottom-nav" aria-label="Navegacao principal">
      <button
        type="button"
        className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
        onClick={() => onChangeTab('overview')}
      >
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
        </svg>
        <span className="nav-label">VISAO GERAL</span>
      </button>

      <button
        type="button"
        className={`nav-tab ${activeTab === 'forecast' ? 'active' : ''}`}
        onClick={() => onChangeTab('forecast')}
      >
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <path d="M7 15l4-5 4 3 5-7" />
        </svg>
        <span className="nav-label">PREVISAO</span>
      </button>

      <button
        type="button"
        className={`nav-tab ${activeTab === 'deepdive' ? 'active' : ''}`}
        onClick={() => onChangeTab('deepdive')}
      >
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="18" cy="8" r="2.5" />
          <circle cx="12" cy="18" r="2.5" />
          <path d="M8.2 7.2l7.6 1.2M7.5 8.2l3.5 7.5M16.5 10.2l-3.2 5.6" />
        </svg>
        <span className="nav-label">ANALISE</span>
      </button>

      <button
        type="button"
        className={`nav-tab ${activeTab === 'map' ? 'active' : ''}`}
        onClick={() => onChangeTab('map')}
      >
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        <span className="nav-label">MAPA</span>
      </button>
    </nav>
  );
}
