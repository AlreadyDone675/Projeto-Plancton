import React from 'react';

export default function SettingsModal({
  isOpen,
  onClose,
  theme,
  onChangeTheme,
  fontSize,
  onChangeFontSize,
  highContrast,
  onToggleHighContrast
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="settings-sheet"
        role="dialog"
        aria-label="Configuracoes"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h2 className="settings-title">Configuracoes</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="settings-group">
          <span className="settings-label">Tema</span>
          <div className="segmented-control">
            <button
              type="button"
              className={`seg-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => onChangeTheme('light')}
            >
              Claro
            </button>
            <button
              type="button"
              className={`seg-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => onChangeTheme('dark')}
            >
              Escuro
            </button>
          </div>
        </div>

        <div className="settings-group">
          <span className="settings-label">Tamanho da fonte</span>
          <div className="segmented-control">
            <button
              type="button"
              className={`seg-btn ${fontSize === 'normal' ? 'active' : ''}`}
              onClick={() => onChangeFontSize('normal')}
            >
              Normal
            </button>
            <button
              type="button"
              className={`seg-btn ${fontSize === 'large' ? 'active' : ''}`}
              onClick={() => onChangeFontSize('large')}
            >
              Grande
            </button>
          </div>
        </div>

        <div className="settings-group">
          <span className="settings-label">Contraste</span>
          <div className="segmented-control">
            <button
              type="button"
              className={`seg-btn ${!highContrast ? 'active' : ''}`}
              onClick={() => onToggleHighContrast(false)}
            >
              Padrao
            </button>
            <button
              type="button"
              className={`seg-btn ${highContrast ? 'active' : ''}`}
              onClick={() => onToggleHighContrast(true)}
            >
              Alto Contraste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
