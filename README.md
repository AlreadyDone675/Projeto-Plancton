# Connectivity Forecast API — ConnectTech

Plataforma integrada de previsão, análise de qualidade de conexão de rede e telemetria, desenvolvida para a disciplina de **Análise e Projeto de Sistemas II (APS II — 2026/2, Squad Plancton)** sob orientação do **Prof. Davi de Oliveira Cruz**.

O ecossistema é composto por:
1. **Frontend Web & Mobile (React / Vite / Capacitor):** Interface mobile-first com mapa interativo (Leaflet), previsão de 48h (2 dias) nas 15 probes reais do RIPE Atlas no Brasil, cards de qualidade e validação de adequação de atividades em tempo real.
2. **Backend REST API (Java / Spring Boot):** Inteligência de previsão de conectividade baseada em modelos de Machine Learning e dados do RIPE Atlas.
3. **Módulo de Inteligência & Monitoramento Python (ML, ICMP & SQLite):** Coleta de dados horários do RIPE Atlas, treino de 4 modelos preditivos e script de medição de latência/jitter local.

---

## 📋 1. Pré-requisitos (Download dos Serviços)

Certifique-se de ter os serviços abaixo instalados em seu sistema operacional antes de prosseguir:

* **Node.js (18+ / LTS com npm):** [Download oficial do Node.js](https://nodejs.org/)
* **Java JDK (17+ ou 21):** [Download do JDK (Eclipse Temurin)](https://adoptium.net/) ou [Oracle JDK](https://www.oracle.com/java/technologies/downloads/#java17)
* **Apache Maven (3.9+):** [Download oficial do Apache Maven](https://maven.apache.org/download.cgi) *(Opcional se utilizar o VS Code com a extensão Extension Pack for Java)*
* **Python (3.9+ com pip):** [Download oficial do Python](https://www.python.org/downloads/)

---

## 📦 2. Instalação de Dependências

Com os serviços instalados em sua máquina, execute a instalação dos pacotes na ordem abaixo:

### 1. Frontend (Node / React)
Acesse a pasta `frontend` e instale as dependências:
```bash
cd frontend
npm install
cd ..
```

### 2. Backend (Java / Maven)
Na raiz do repositório, baixe as dependências e compile os artefatos:
```bash
mvn clean install -DskipTests
```

### 3. Módulo Python
Na raiz do repositório, instale as dependências de Machine Learning e automação:
```bash
pip install -r requirements.txt
```

---

## 🚀 3. Como Executar

### 1. Iniciar o Backend (API Spring Boot)
Na raiz do projeto, escolha **uma** das opções abaixo:

#### Opção A: Executar diretamente via Maven (Recomendado)
```bash
mvn spring-boot:run
```

#### Opção B: Compilar e executar via JAR Standalone
```bash
# 1. Compila o projeto e gera o arquivo JAR em target/
mvn clean package -DskipTests

# 2. Executa a aplicação a partir do JAR gerado
java -jar target/connectivity-forecast-api-1.0.0.jar
```

#### Opção C: Executar pela interface gráfica do VS Code
1. Abra o arquivo `src/main/java/com/brazcubas/apsii/ConnectivityForecastApiApplication.java`.
2. Clique no botão **`Run`** (ou `Debug`) exibido acima do método `main`.

A API estará disponível em `http://localhost:8080`.

---

### 2. Iniciar o Frontend Web (React / Vite)
Em um novo terminal:
```bash
cd frontend
npm run dev
```
Acesse a aplicação no navegador em `http://localhost:5173`. O Vite já possui proxy configurado para encaminhar requisições `/api` automaticamente para a porta `8080`.

---

### 3. Coletar Dados Históricos e Treinar Modelos de ML (Python - Opcional)
Para atualizar o histórico horário de 1 ano completo (15 probes do RIPE Atlas no Brasil) e retreinar os 4 modelos de Machine Learning (`LinearRegression`, `RandomForest`, `DecisionTree`, `GradientBoosting`), gerando as 2.880 previsões em `data/predictions.csv`:
```bash
# 1. Coleta o histórico da API pública do RIPE Atlas (gera measurements_history.csv)
python src/ripeatlas.py

# 2. Treina os modelos e gera as previsões para o Backend Java (data/predictions.csv)
python src/gerar_previsoes.py
```

---

### 4. Executar o Monitor ICMP Local (Python - Opcional)
Para executar ciclos de ping locais, cálculo de RTT, Jitter, TTL e gravação em banco SQLite local (`rede_monitoramento.db`):
```bash
python main.py
```

---

### 5. Build e Sincronização Mobile (Android / Capacitor - Opcional)
Para sincronizar as alterações web com o projeto nativo Android:
```bash
cd frontend
npm run mobile:sync
```

---

## 📖 4. Documentação Interativa da API

Após iniciar o backend, acesse no navegador:
* **Swagger UI:** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
* **OpenAPI Docs (JSON):** [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

---

## 📌 5. Principais Endpoints (`/api/v1`)

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Estado de integridade da API |
| `GET` | `/api/v1/locations` | Lista de probes/cidades e coordenadas geográficas |
| `GET` | `/api/v1/models` | Catálogo de modelos de predição e acurácia |
| `GET` | `/api/v1/forecasts/probes/{id}/timeline` | Previsão horária de 48h (2 dias) para a sonda especificada |
| `GET` | `/api/v1/forecasts/nearby` | Consulta de previsão por geolocalização mais próxima (Haversine) |
| `POST` | `/api/v1/activity/check` | Validação de adequação de rede para atividade (Vídeo, Jogos, Streaming) |
| `GET` | `/api/v1/live/probes` | Telemetria ao vivo sincronizada com a rede RIPE Atlas |
| `POST` | `/api/v1/live/refresh` | Força atualização manual do cache do RIPE Atlas |

---

## 🎯 6. Escopo e Características Técnicas

* **Simulação Local & Fixtures:** Dados de previsão carregados em memória a partir de `data/predictions.csv` (coletados originalmente via API pública do RIPE Atlas com 4 modelos ativos e histórico horário).
* **Telemetria Híbrida / RIPE Atlas:** Sincronização periódica com a rede pública global do RIPE Atlas para leitura de latência e perda de pacotes em tempo real.
* **Resiliência e Fallback Offline:** O frontend possui tolerância a falhas — se o backend Spring Boot estiver indisponível, ativa fallback em memória ou lê o CSV localmente.
* **Higiene de Versionamento:** Diretórios pesados como `node_modules/`, `target/`, builds móveis (`dist/`, `.apk`, `.aab`), cache do Gradle e bancos SQLite locais são gerados sob demanda e ignorados pelo `.gitignore`.

---

## 📄 7. Licença e Referências

* Reimplementação baseada na [API de referência](https://github.com/LiniiS/connectivity-forecast-api) sob licença MIT.
* Repositório do Squad Plancton: [APS II - ConnectTech](https://github.com/AlreadyDone675/Projeto-Plancton)

---

## 🛠️ 8. Resolução de Problemas Comuns no Backend

* **`Unable to access jarfile target/...jar`**: Significa que o arquivo `.jar` ainda não foi gerado nesta máquina. Execute `mvn clean package -DskipTests` primeiro (ou utilize a **Opção A** via Maven ou **Opção C** via VS Code).
* **Erro de segurança no PowerShell (`PSSecurityException` / scripts desabilitados)**: Ocorre quando o PowerShell restringe a execução de scripts locais. Para liberar a execução para seu usuário, execute uma única vez no PowerShell:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
* **Comando `mvn` não reconhecido (Maven não instalado ou fora do PATH)**: Certifique-se de que o Maven foi baixado e que o caminho da pasta `bin` foi adicionado à variável de ambiente `Path` do sistema operacional. Alternativamente, utilize a **Opção C**: abra o arquivo `src/main/java/com/brazcubas/apsii/ConnectivityForecastApiApplication.java` no VS Code com a extensão *Extension Pack for Java* e clique em **`Run`** sem necessidade do CLI `mvn`.
