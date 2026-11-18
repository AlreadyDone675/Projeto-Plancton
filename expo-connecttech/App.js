import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Switch,
  Platform,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// ==========================================
// DADOS MOCKADOS DAS 15 PROBES REAIS (RIPE ATLAS BRASIL)
// ==========================================
const PROBES = [
  { id: 6790, city: 'São Paulo (Vila Mariana)', uf: 'SP', rtt: 34.8, loss: 0.0, jitter: 0.29, asn: 'AS57695' },
  { id: 6410, city: 'São Paulo (Zona Sul)', uf: 'SP', rtt: 46.4, loss: 0.0, jitter: 1.34, asn: 'AS22548' },
  { id: 7113, city: 'Barueri (Alphaville)', uf: 'SP', rtt: 28.1, loss: 0.0, jitter: 0.45, asn: 'AS28573' },
  { id: 6540, city: 'Campinas', uf: 'SP', rtt: 36.2, loss: 0.0, jitter: 0.95, asn: 'AS28573' },
  { id: 6891, city: 'Belo Horizonte', uf: 'MG', rtt: 20.5, loss: 0.0, jitter: 2.15, asn: 'AS271354' },
  { id: 6920, city: 'Rio de Janeiro', uf: 'RJ', rtt: 31.0, loss: 0.0, jitter: 0.62, asn: 'AS28573' },
  { id: 6851, city: 'Brasília', uf: 'DF', rtt: 29.3, loss: 0.0, jitter: 0.81, asn: 'AS28573' },
  { id: 7019, city: 'Ponta Grossa', uf: 'PR', rtt: 18.6, loss: 0.0, jitter: 0.34, asn: 'AS53046' },
  { id: 6612, city: 'Curitiba', uf: 'PR', rtt: 24.8, loss: 0.0, jitter: 0.51, asn: 'AS18881' },
  { id: 6349, city: 'Porto Alegre', uf: 'RS', rtt: 52.4, loss: 0.5, jitter: 2.77, asn: 'AS2716' },
  { id: 6734, city: 'Florianópolis', uf: 'SC', rtt: 38.5, loss: 0.0, jitter: 0.73, asn: 'AS28573' },
  { id: 7307, city: 'Feira de Santana', uf: 'BA', rtt: 34.5, loss: 0.0, jitter: 0.59, asn: 'AS264479' },
  { id: 11315, city: 'Recife', uf: 'PE', rtt: 22.2, loss: 0.0, jitter: 0.40, asn: 'AS262792' },
  { id: 7242, city: 'Fortaleza', uf: 'CE', rtt: 66.0, loss: 0.0, jitter: 0.37, asn: 'AS37468' },
  { id: 6980, city: 'Goiânia', uf: 'GO', rtt: 42.1, loss: 0.2, jitter: 1.10, asn: 'AS28573' }
];

// MODELOS DE PREVISÃO (MACHINE LEARNING)
const MODELS = [
  { id: 'model-a', name: 'Modelo A', group: 'Grupo 1', algorithm: 'Regressão Linear', accuracy: '94.2%', color: '#0284c7' },
  { id: 'model-b', name: 'Modelo B', group: 'Grupo 2', algorithm: 'Random Forest', accuracy: '96.8%', color: '#0d9488' },
  { id: 'model-c', name: 'Modelo C', group: 'Grupo 3', algorithm: 'Árvore de Decisão', accuracy: '91.5%', color: '#8b5cf6' },
  { id: 'model-d', name: 'Modelo D', group: 'Grupo 4', algorithm: 'Gradient Boosting', accuracy: '97.4%', color: '#f59e0b' }
];

// ATIVIDADES E REQUISITOS
const ACTIVITIES = [
  { id: '1', title: 'Videochamada HD', icon: 'videocam', minQuality: 'GOOD', desc: 'Requer RTT < 60ms e sem perda' },
  { id: '2', title: 'Streaming 4K / Vídeo', icon: 'play-circle', minQuality: 'GOOD', desc: 'Largura de banda e jitter baixo' },
  { id: '3', title: 'Chamada de Voz (VoIP)', icon: 'call', minQuality: 'MODERATE', desc: 'Tolerância moderada a atrasos' },
  { id: '4', title: 'Navegação e Redes', icon: 'globe', minQuality: 'MODERATE', desc: 'Acesso a sites e portais web' },
  { id: '5', title: 'Envio de Arquivos', icon: 'cloud-upload', minQuality: 'MODERATE', desc: 'Downloads e sincronização de dados' },
  { id: '6', title: 'Mensagens de Texto', icon: 'chatbubbles', minQuality: 'UNSTABLE', desc: 'Baixo consumo, alta tolerância' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, forecast, probes, deepdive, settings
  const [selectedProbeId, setSelectedProbeId] = useState(6790);
  const [selectedModelId, setSelectedModelId] = useState('model-b');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [searchUf, setSearchUf] = useState('');
  const [simOffset, setSimOffset] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState('Agora');

  const selectedProbe = useMemo(() => {
    return PROBES.find(p => p.id === selectedProbeId) || PROBES[0];
  }, [selectedProbeId]);

  const selectedModel = useMemo(() => {
    return MODELS.find(m => m.id === selectedModelId) || MODELS[1];
  }, [selectedModelId]);

  // Métricas dinâmicas com simulação
  const currentRtt = useMemo(() => {
    const val = selectedProbe.rtt + (simOffset * 1.8);
    return Math.max(8.0, Number(val.toFixed(1)));
  }, [selectedProbe, simOffset]);

  const currentLoss = useMemo(() => {
    const val = selectedProbe.loss + (simOffset > 2 ? 0.4 : 0.0);
    return Number(val.toFixed(1));
  }, [selectedProbe, simOffset]);

  const quality = useMemo(() => {
    if (currentRtt <= 60 && currentLoss < 1.0) return { label: 'Excelente', color: '#10b981', code: 'GOOD', badge: 'Estável' };
    if (currentRtt <= 150 && currentLoss < 5.0) return { label: 'Moderada', color: '#f59e0b', code: 'MODERATE', badge: 'Alerta' };
    return { label: 'Instável', color: '#ef4444', code: 'UNSTABLE', badge: 'Crítico' };
  }, [currentRtt, currentLoss]);

  // Simulação de nova leitura
  const handleSimulateSync = () => {
    const delta = (Math.random() * 4 - 2);
    setSimOffset(prev => prev + delta);
    const now = new Date();
    setLastSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
  };

  // Cores de tema
  const colors = useMemo(() => {
    if (isDarkMode) {
      return {
        bg: '#090d16',
        surface: '#121826',
        surfaceCard: '#1a2234',
        border: '#222f46',
        text: '#f8fafc',
        textSecondary: '#94a3b8',
        brand: '#0284c7',
        accent: '#38bdf8',
        tabBar: '#0d1320'
      };
    }
    return {
      bg: '#f1f5f9',
      surface: '#ffffff',
      surfaceCard: '#ffffff',
      border: '#e2e8f0',
      text: '#0f172a',
      textSecondary: '#64748b',
      brand: '#0284c7',
      accent: '#0369a1',
      tabBar: '#ffffff'
    };
  }, [isDarkMode]);

  // 24h Timeline Mock
  const timeline = useMemo(() => {
    const hours = ['00h', '03h', '06h', '09h', '12h', '15h', '18h', '21h'];
    return hours.map((h, i) => {
      const peak = (h === '18h' || h === '21h') ? 22 : 0;
      const rttVal = Math.round(currentRtt + (i * 2.1) + peak - 8);
      const isPeak = h === '18h';
      return { hour: h, rtt: rttVal, isPeak };
    });
  }, [currentRtt]);

  // ==========================================
  // RENDERIZAÇÃO DAS TELAS
  // ==========================================

  // TELA 1: VISÃO GERAL
  const renderOverview = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Hero Status Card */}
      <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <View style={styles.rowBetween}>
          <View style={styles.badgeRow}>
            <View style={[styles.dot, { backgroundColor: quality.color }]} />
            <Text style={[styles.badgeText, { color: quality.color }]}>{quality.badge.toUpperCase()}</Text>
          </View>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>Sinc: {lastSyncTime}</Text>
        </View>

        <Text style={[styles.statusTitle, { color: colors.text }]}>Qualidade {quality.label}</Text>
        <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
          Probe {selectedProbe.id} • {selectedProbe.city} ({selectedProbe.uf})
        </Text>

        {/* Big Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="speedometer-outline" size={20} color={colors.brand} />
            <Text style={[styles.metricVal, { color: colors.text }]}>{currentRtt} ms</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Latência RTT</Text>
          </View>

          <View style={[styles.metricBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="cloud-offline-outline" size={20} color={quality.color} />
            <Text style={[styles.metricVal, { color: quality.color }]}>{currentLoss}%</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Perda de Pacotes</Text>
          </View>

          <View style={[styles.metricBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="pulse-outline" size={20} color="#a855f7" />
            <Text style={[styles.metricVal, { color: colors.text }]}>{selectedProbe.jitter} ms</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Jitter</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.brand }]}
          onPress={handleSimulateSync}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnText}>Simular Nova Medição RIPE Atlas</Text>
        </TouchableOpacity>
      </View>

      {/* Seção: Atividades Recomendadas */}
      <Text style={[styles.sectionHeading, { color: colors.text }]}>Atividades Compatíveis Agora</Text>
      <View style={styles.activitiesList}>
        {ACTIVITIES.map(act => {
          const isAllowed =
            act.minQuality === 'UNSTABLE' ||
            (act.minQuality === 'MODERATE' && quality.code !== 'UNSTABLE') ||
            (act.minQuality === 'GOOD' && quality.code === 'GOOD');

          return (
            <View
              key={act.id}
              style={[
                styles.activityItem,
                { backgroundColor: colors.surfaceCard, borderColor: colors.border },
                !isAllowed && { opacity: 0.45 }
              ]}
            >
              <View style={[styles.actIconCircle, { backgroundColor: isAllowed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                <Ionicons name={act.icon} size={20} color={isAllowed ? '#10b981' : '#ef4444'} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.actTitle, { color: colors.text }]}>{act.title}</Text>
                <Text style={[styles.actDesc, { color: colors.textSecondary }]}>{act.desc}</Text>
              </View>
              <Ionicons
                name={isAllowed ? "checkmark-circle" : "close-circle"}
                size={22}
                color={isAllowed ? "#10b981" : "#ef4444"}
              />
            </View>
          );
        })}
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );

  // TELA 2: PREVISÕES DE IA
  const renderForecast = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Seletor de Modelo */}
      <Text style={[styles.sectionHeading, { color: colors.text }]}>Modelos de Inteligência Artificial</Text>
      <View style={styles.modelsContainer}>
        {MODELS.map(m => {
          const isSelected = m.id === selectedModelId;
          return (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.modelCard,
                { backgroundColor: colors.surfaceCard, borderColor: isSelected ? colors.brand : colors.border },
                isSelected && { borderWidth: 2 }
              ]}
              onPress={() => setSelectedModelId(m.id)}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.modelName, { color: colors.text }]}>{m.name}</Text>
                <View style={[styles.accBadge, { backgroundColor: m.color + '20' }]}>
                  <Text style={[styles.accText, { color: m.color }]}>{m.accuracy}</Text>
                </View>
              </View>
              <Text style={[styles.modelAlgo, { color: colors.textSecondary }]}>{m.algorithm}</Text>
              <Text style={[styles.modelGroup, { color: colors.textSecondary }]}>{m.group}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Gráfico / Timeline Previsão */}
      <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 18 }]}>
        Previsão 24h ({selectedModel.name})
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <Text style={[styles.chartSub, { color: colors.textSecondary }]}>
          Estimativa de Latência (RTT em ms) por faixa horária
        </Text>

        <View style={styles.chartBarsContainer}>
          {timeline.map((item, idx) => {
            const barHeight = Math.min(130, Math.max(25, item.rtt * 1.6));
            const barColor = item.rtt > 60 ? '#ef4444' : item.rtt > 45 ? '#f59e0b' : '#10b981';

            return (
              <View key={idx} style={styles.barCol}>
                <Text style={[styles.barVal, { color: colors.textSecondary }]}>{item.rtt}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: barHeight, backgroundColor: barColor }]} />
                </View>
                <Text style={[styles.barLabel, { color: item.isPeak ? '#f59e0b' : colors.textSecondary, fontWeight: item.isPeak ? '700' : '400' }]}>
                  {item.hour}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.peakAlert, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
          <Ionicons name="information-circle-outline" size={18} color="#f59e0b" />
          <Text style={[styles.peakAlertText, { color: '#f59e0b' }]}>
            Horário de Pico previsto: 18h às 21h (aumento estimado de +15ms no RTT).
          </Text>
        </View>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );

  // TELA 3: PROBES DO BRASIL
  const renderProbes = () => {
    const filtered = PROBES.filter(p =>
      p.city.toLowerCase().includes(searchUf.toLowerCase()) ||
      p.uf.toLowerCase().includes(searchUf.toLowerCase()) ||
      String(p.id).includes(searchUf)
    );

    return (
      <View style={styles.flexOne}>
        {/* Input de Busca */}
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar por UF (SP, RJ, MG...), Cidade ou ID"
            placeholderTextColor={colors.textSecondary}
            value={searchUf}
            onChangeText={setSearchUf}
          />
          {searchUf.length > 0 && (
            <TouchableOpacity onPress={() => setSearchUf('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.probesCount, { color: colors.textSecondary }]}>
            {filtered.length} Probes RIPE Atlas registradas no Brasil
          </Text>

          {filtered.map(item => {
            const isSelected = item.id === selectedProbeId;
            const pQualityColor = item.rtt <= 40 ? '#10b981' : item.rtt <= 60 ? '#f59e0b' : '#ef4444';

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.probeCard,
                  { backgroundColor: colors.surfaceCard, borderColor: isSelected ? colors.brand : colors.border },
                  isSelected && { borderWidth: 2 }
                ]}
                onPress={() => {
                  setSelectedProbeId(item.id);
                  setActiveTab('overview');
                }}
              >
                <View style={styles.rowBetween}>
                  <View style={styles.probeTitleRow}>
                    <View style={[styles.ufBadge, { backgroundColor: colors.brand + '25' }]}>
                      <Text style={[styles.ufText, { color: colors.brand }]}>{item.uf}</Text>
                    </View>
                    <View>
                      <Text style={[styles.probeCity, { color: colors.text }]}>{item.city}</Text>
                      <Text style={[styles.probeAsn, { color: colors.textSecondary }]}>Probe #{item.id} • {item.asn}</Text>
                    </View>
                  </View>

                  <View style={styles.probeRttBox}>
                    <Text style={[styles.probeRttVal, { color: pQualityColor }]}>{item.rtt} ms</Text>
                    <Text style={[styles.probeRttSub, { color: colors.textSecondary }]}>Latência</Text>
                  </View>
                </View>

                {isSelected && (
                  <View style={styles.selectedPill}>
                    <Ionicons name="checkmark-sharp" size={14} color="#0284c7" />
                    <Text style={styles.selectedPillText}>Probe Ativa no Aplicativo</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    );
  };

  // TELA 4: DIAGNÓSTICO & DEEP DIVE
  const renderDeepDive = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionHeading, { color: colors.text }]}>Telemetria Avançada de Rede</Text>

      <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Parâmetros Estatísticos</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.text }]}>{(currentRtt * 0.75).toFixed(1)} ms</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>RTT Mínimo</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.text }]}>{currentRtt} ms</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>RTT Mediano</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: '#f59e0b' }]}>{(currentRtt * 1.45).toFixed(1)} ms</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>RTT Máximo</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 14 }]}>Sobre as Métricas</Text>
      <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <View style={styles.infoBlock}>
          <Text style={[styles.infoTitle, { color: colors.brand }]}>⏱️ RTT (Round Trip Time / Ping)</Text>
          <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
            Tempo que um pacote de dados leva para ir até o destino e voltar. Valores abaixo de 60ms são excelentes para streaming e chamadas interativas.
          </Text>
        </View>

        <View style={[styles.infoBlock, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 12 }]}>
          <Text style={[styles.infoTitle, { color: '#ef4444' }]}>📦 Perda de Pacotes (Packet Loss)</Text>
          <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
            Percentual de pacotes que não chegam ao destino. Qualquer perda acima de 1% pode causar cortes em áudio e buffering em vídeos.
          </Text>
        </View>

        <View style={[styles.infoBlock, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 12 }]}>
          <Text style={[styles.infoTitle, { color: '#a855f7' }]}>🌐 RIPE Atlas Global Network</Text>
          <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
            Maior rede de medição de internet do mundo, com milhares de sondas físicas monitorando a integridade da internet em tempo real.
          </Text>
        </View>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );

  // TELA 5: CONFIGURAÇÕES
  const renderSettings = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionHeading, { color: colors.text }]}>Preferências Visuais</Text>
      <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <View style={styles.settingRow}>
          <View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Tema Escuro</Text>
            <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Reduz o cansaço visual</Text>
          </View>
          <Switch value={isDarkMode} onValueChange={setIsDarkMode} trackColor={{ false: '#767577', true: '#0284c7' }} />
        </View>

        <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 12 }]}>
          <View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Modo Alto Contraste</Text>
            <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Aumenta legibilidade de textos</Text>
          </View>
          <Switch value={highContrast} onValueChange={setHighContrast} trackColor={{ false: '#767577', true: '#0284c7' }} />
        </View>
      </View>

      <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 14 }]}>Sobre o Projeto</Text>
      <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <Text style={[styles.aboutTitle, { color: colors.text }]}>ConnectTech • Projeto Plâncton</Text>
        <Text style={[styles.aboutDesc, { color: colors.textSecondary }]}>
          Desenvolvido para demonstração acadêmica universitária. Combina predições de inteligência artificial com telemetria de conectividade via RIPE Atlas no Brasil.
        </Text>
        <View style={styles.aboutBadgeRow}>
          <View style={[styles.tagBadge, { backgroundColor: colors.brand + '20' }]}>
            <Text style={[styles.tagText, { color: colors.brand }]}>Expo SDK 58</Text>
          </View>
          <View style={[styles.tagBadge, { backgroundColor: '#10b98120' }]}>
            <Text style={[styles.tagText, { color: '#10b981' }]}>React Native</Text>
          </View>
          <View style={[styles.tagBadge, { backgroundColor: '#f59e0b20' }]}>
            <Text style={[styles.tagText, { color: '#f59e0b' }]}>Mocks Offline</Text>
          </View>
        </View>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header Superior */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoIcon, { backgroundColor: colors.brand }]}>
            <Ionicons name="cellular" size={18} color="#ffffff" />
          </View>
          <View>
            <Text style={[styles.logoTitle, { color: colors.text }]}>ConnectTech</Text>
            <Text style={[styles.logoSub, { color: colors.textSecondary }]}>Previsão de Conectividade</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.headerSyncBtn, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
          onPress={handleSimulateSync}
        >
          <Ionicons name="refresh" size={16} color={colors.brand} />
        </TouchableOpacity>
      </View>

      {/* Conteúdo Dinâmico por Aba */}
      <View style={styles.flexOne}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'forecast' && renderForecast()}
        {activeTab === 'probes' && renderProbes()}
        {activeTab === 'deepdive' && renderDeepDive()}
        {activeTab === 'settings' && renderSettings()}
      </View>

      {/* Barra Inferior de Navegação */}
      <View style={[styles.tabBar, { backgroundColor: colors.tabBar, borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('overview')}>
          <Ionicons
            name={activeTab === 'overview' ? "home" : "home-outline"}
            size={22}
            color={activeTab === 'overview' ? colors.brand : colors.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: activeTab === 'overview' ? colors.brand : colors.textSecondary }]}>
            Início
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('forecast')}>
          <Ionicons
            name={activeTab === 'forecast' ? "trending-up" : "trending-up-outline"}
            size={22}
            color={activeTab === 'forecast' ? colors.brand : colors.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: activeTab === 'forecast' ? colors.brand : colors.textSecondary }]}>
            Previsões
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('probes')}>
          <Ionicons
            name={activeTab === 'probes' ? "location" : "location-outline"}
            size={22}
            color={activeTab === 'probes' ? colors.brand : colors.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: activeTab === 'probes' ? colors.brand : colors.textSecondary }]}>
            Probes BR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('deepdive')}>
          <Ionicons
            name={activeTab === 'deepdive' ? "analytics" : "analytics-outline"}
            size={22}
            color={activeTab === 'deepdive' ? colors.brand : colors.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: activeTab === 'deepdive' ? colors.brand : colors.textSecondary }]}>
            Diagnóstico
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('settings')}>
          <Ionicons
            name={activeTab === 'settings' ? "settings" : "settings-outline"}
            size={22}
            color={activeTab === 'settings' ? colors.brand : colors.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: activeTab === 'settings' ? colors.brand : colors.textSecondary }]}>
            Ajustes
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// ESTILOS NATIVOS REACT NATIVE
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  flexOne: {
    flex: 1
  },
  header: {
    height: 60,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: '700'
  },
  logoSub: {
    fontSize: 11
  },
  headerSyncBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollContent: {
    flex: 1,
    padding: 16
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  timeText: {
    fontSize: 11
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8
  },
  statusSubtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 16
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  metricBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center'
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4
  },
  metricLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center'
  },
  actionBtn: {
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12
  },
  activitiesList: {
    gap: 8
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12
  },
  actIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actTitle: {
    fontSize: 14,
    fontWeight: '600'
  },
  actDesc: {
    fontSize: 11,
    marginTop: 2
  },
  modelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  modelCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12
  },
  modelName: {
    fontSize: 14,
    fontWeight: '700'
  },
  accBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  accText: {
    fontSize: 11,
    fontWeight: '700'
  },
  modelAlgo: {
    fontSize: 11,
    marginTop: 6
  },
  modelGroup: {
    fontSize: 10,
    marginTop: 2
  },
  chartSub: {
    fontSize: 12,
    marginBottom: 16
  },
  chartBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingBottom: 4
  },
  barCol: {
    alignItems: 'center',
    flex: 1
  },
  barVal: {
    fontSize: 9,
    marginBottom: 4
  },
  barTrack: {
    width: 14,
    height: 100,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 7,
    overflow: 'hidden'
  },
  barFill: {
    width: '100%',
    borderRadius: 7
  },
  barLabel: {
    fontSize: 10,
    marginTop: 6
  },
  peakAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 16
  },
  peakAlertText: {
    fontSize: 11,
    flex: 1
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44
  },
  searchInput: {
    flex: 1,
    fontSize: 13
  },
  probesCount: {
    fontSize: 12,
    marginBottom: 10
  },
  probeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8
  },
  probeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  ufBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ufText: {
    fontSize: 13,
    fontWeight: '800'
  },
  probeCity: {
    fontSize: 14,
    fontWeight: '600'
  },
  probeAsn: {
    fontSize: 11,
    marginTop: 2
  },
  probeRttBox: {
    alignItems: 'flex-end'
  },
  probeRttVal: {
    fontSize: 15,
    fontWeight: '700'
  },
  probeRttSub: {
    fontSize: 10
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(2, 132, 199, 0.2)'
  },
  selectedPillText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600'
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statCol: {
    alignItems: 'center'
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800'
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4
  },
  infoBlock: {
    gap: 4
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700'
  },
  infoDesc: {
    fontSize: 12,
    lineHeight: 18
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600'
  },
  settingDesc: {
    fontSize: 11,
    marginTop: 2
  },
  aboutTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6
  },
  aboutDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12
  },
  aboutBadgeRow: {
    flexDirection: 'row',
    gap: 8
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600'
  },
  tabBar: {
    height: 58,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 12 : 0
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600'
  }
});
