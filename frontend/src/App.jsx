import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BottomNav from './components/BottomNav';
import SettingsModal from './components/SettingsModal';
import DeepDivePage from './pages/DeepDivePage';
import ForecastPage from './pages/ForecastPage';
import MapPage from './pages/MapPage';
import OverviewPage from './pages/OverviewPage';
import { forecastRepository } from './repository/forecastRepository';
import { forecastService } from './service/forecastService';

function getSystemTimeState() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return {
    hour: now.getHours(),
    display: `${hh}:${mm}`
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  // Padrao Sao Paulo - Zona Sul (Probe RIPE Atlas 6410) caso a geolocalizacao nao seja aceita
  const [selectedProbeId, setSelectedProbeId] = useState(6410);
  const [userCoords, setUserCoords] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('normal');
  const [highContrast, setHighContrast] = useState(false);

  // Versao unificada dos dados para manter todas as telas 100% sincronizadas
  const [dataVersion, setDataVersion] = useState(0);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);

  const [timeState, setTimeState] = useState(() => getSystemTimeState());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeState(getSystemTimeState());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = timeState.hour;
  const clockDisplay = timeState.display;

  // Geolocalizacao opcional
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      },
      () => {
        setUserCoords(null);
      },
      { timeout: 4000 }
    );
  }, []);

  // 1. Sincronizacao inicial com o backend ou fallback CSV + RIPE Atlas ao vivo
  useEffect(() => {
    forecastService.syncWithBackend().then(() => {
      setIsLiveActive(true);
      setDataVersion((v) => v + 1);
    });
  }, []);

  const allProbes = useMemo(
    () => forecastService.listAllProbesWithForecast('model-a', currentHour),
    [currentHour, dataVersion]
  );

  const selectedProbe = useMemo(
    () =>
      forecastRepository.findProbeById(selectedProbeId) ||
      forecastRepository.findAllProbes()[0],
    [selectedProbeId, dataVersion]
  );

  // Coordenada fixa de referencia (geolocalizacao reconhecida ou Sao Paulo 6410)
  // para que a lista das 3 areas mais proximas nao mude ao clicar em um card
  const anchorCoords = useMemo(() => {
    if (userCoords) return userCoords;
    const defaultProbe =
      forecastRepository.findProbeById(6410) || forecastRepository.findAllProbes()[0];
    return {
      latitude: defaultProbe.latitude,
      longitude: defaultProbe.longitude
    };
  }, [userCoords, dataVersion]);

  const nearbyForecast = useMemo(() => {
    const lat = userCoords ? userCoords.latitude : selectedProbe.latitude;
    const lon = userCoords ? userCoords.longitude : selectedProbe.longitude;
    return forecastService.getNearbyForecast(lat, lon, 'model-a', currentHour);
  }, [selectedProbe, userCoords, currentHour, dataVersion]);

  const activeProbeId = nearbyForecast.probeInfo.probeId;

  // 2. Carregar timeline e telemetria viva para a regiao ativa
  useEffect(() => {
    let isSubscribed = true;

    Promise.all([
      forecastService.loadBackendTimeline(activeProbeId, 'model-a'),
      forecastService.getLiveTelemetry(activeProbeId)
    ]).then(([, liveData]) => {
      if (isSubscribed) {
        if (liveData) {
          setIsLiveActive(true);
        }
        setDataVersion((v) => v + 1);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [activeProbeId]);

  // 3. Atualizacao automatica em tempo real a cada 30s via RIPE Atlas
  useEffect(() => {
    const interval = setInterval(() => {
      forecastService.getAllLiveProbes().then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setIsLiveActive(true);
          setDataVersion((v) => v + 1);
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const timelineData = useMemo(
    () => forecastService.getProbeTimeline(activeProbeId, 'model-a', [], currentHour),
    [activeProbeId, currentHour, dataVersion]
  );

  const handleSelectProbe = (probeId) => {
    setUserCoords(null);
    setSelectedProbeId(Number(probeId));
  };

  // Atualizar manualmente os dados ao vivo do RIPE Atlas
  const handleRefreshLive = useCallback(async () => {
    setIsLiveSyncing(true);
    try {
      await forecastService.refreshLive();
      await forecastService.getLiveTelemetry(activeProbeId);
      await forecastService.loadBackendTimeline(activeProbeId, 'model-a');
      setIsLiveActive(true);
      setDataVersion((v) => v + 1);
    } finally {
      setIsLiveSyncing(false);
    }
  }, [activeProbeId]);

  return (
    <div
      className={`app-shell ${theme === 'dark' ? 'theme-dark' : ''} ${
        fontSize === 'large' ? 'font-large' : ''
      } ${highContrast ? 'high-contrast' : ''}`}
    >
      <div className="mobile-frame">
        <main className="main-scroll">
          {activeTab === 'overview' && (
            <OverviewPage
              nearbyForecast={nearbyForecast}
              allProbes={allProbes}
              anchorCoords={anchorCoords}
              selectedProbeId={activeProbeId}
              onSelectProbe={handleSelectProbe}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenHelp={() => setHelpOpen(true)}
              clockDisplay={clockDisplay}
              isLiveActive={isLiveActive}
              isLiveSyncing={isLiveSyncing}
              onRefreshLive={handleRefreshLive}
            />
          )}

          {activeTab === 'forecast' && (
            <ForecastPage
              nearbyForecast={nearbyForecast}
              timelineData={timelineData}
              selectedProbeId={activeProbeId}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenHelp={() => setHelpOpen(true)}
              onGoToAnalysis={() => setActiveTab('deepdive')}
              currentHour={currentHour}
              clockDisplay={clockDisplay}
              isLiveActive={isLiveActive}
              isLiveSyncing={isLiveSyncing}
              onRefreshLive={handleRefreshLive}
            />
          )}

          {activeTab === 'deepdive' && (
            <DeepDivePage
              allProbes={allProbes}
              selectedProbeId={activeProbeId}
              onSelectProbe={handleSelectProbe}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenHelp={() => setHelpOpen(true)}
              currentHour={currentHour}
              clockDisplay={clockDisplay}
              dataVersion={dataVersion}
              isLiveActive={isLiveActive}
              isLiveSyncing={isLiveSyncing}
              onRefreshLive={handleRefreshLive}
            />
          )}

          {activeTab === 'map' && (
            <MapPage
              nearbyForecast={nearbyForecast}
              allProbes={allProbes}
              selectedProbeId={activeProbeId}
              onSelectProbe={handleSelectProbe}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenHelp={() => setHelpOpen(true)}
              clockDisplay={clockDisplay}
              isLiveActive={isLiveActive}
              isLiveSyncing={isLiveSyncing}
              onRefreshLive={handleRefreshLive}
            />
          )}
        </main>

        {helpOpen && (
          <div className="modal-backdrop" onClick={() => setHelpOpen(false)}>
            <div
              className="settings-sheet"
              role="dialog"
              aria-label="Ajuda sobre metricas"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="settings-header">
                <h2 className="settings-title">Entenda as Métricas</h2>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setHelpOpen(false)}
                >
                  Fechar
                </button>
              </div>

              <div className="settings-group">
                <span className="settings-label">Ping (Latência em ms)</span>
                <p className="placeholder-text">
                  É o tempo (em milissegundos) que um pacote de dados leva para ir do seu
                  ponto de rede até o servidor e voltar. Quanto menor o Ping, mais rápida
                  e imediata é a resposta em chamadas de vídeo e jogos.
                </p>
              </div>

              <div className="settings-group">
                <span className="settings-label">Perca de Pacotes (%)</span>
                <p className="placeholder-text">
                  Indica a porcentagem de pacotes de dados que se perderam no caminho e
                  não chegaram ao destino. Mesmo valores pequenos (acima de 2%) podem
                  causar travamentos na voz, cortes no vídeo e lentidão no carregamento.
                </p>
              </div>
            </div>
          </div>
        )}

        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          theme={theme}
          onChangeTheme={setTheme}
          fontSize={fontSize}
          onChangeFontSize={setFontSize}
          highContrast={highContrast}
          onToggleHighContrast={setHighContrast}
        />

        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
      </div>
    </div>
  );
}
