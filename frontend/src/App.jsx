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
  // Padrao Sao Paulo (900001) caso a geolocalizacao nao seja aceita
  const [selectedProbeId, setSelectedProbeId] = useState(900001);
  const [userCoords, setUserCoords] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
              selectedProbeId={activeProbeId}
              onSelectProbe={handleSelectProbe}
              onOpenSettings={() => setSettingsOpen(true)}
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
              allProbes={allProbes}
              selectedProbeId={activeProbeId}
              onSelectProbe={handleSelectProbe}
              onOpenSettings={() => setSettingsOpen(true)}
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
              clockDisplay={clockDisplay}
              isLiveActive={isLiveActive}
              isLiveSyncing={isLiveSyncing}
              onRefreshLive={handleRefreshLive}
            />
          )}
        </main>

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
