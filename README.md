# Connectivity Forecast API — ConnectTech

Plataforma integrada de previsão, análise de qualidade de conexão de rede e telemetria, desenvolvida para a disciplina de **Análise e Projeto de Sistemas II (APS II — 2026/2, Squad Plancton)** sob orientação do **Prof. Davi de Oliveira Cruz**.

O ecossistema é composto por:
1. **Backend REST API (Java / Spring Boot):** Inteligência de previsão de conectividade baseada em modelos de Machine Learning e dados do RIPE Atlas.
2. **Frontend Web & Mobile (React / Vite / Capacitor):** Interface mobile-first com mapa interativo (Leaflet), previsão de 48h (2 dias) nas 15 probes reais do RIPE Atlas no Brasil, cards de qualidade e validação de adequação de atividades em tempo real.
3. **Módulo de Monitoramento Python (ICMP & SQLite):** Script de medição de latência, cálculo de Jitter e TTL com persistência em banco de dados local.

---

## 📋 Pré-requisitos

* **Java:** JDK 17+
* **Maven:** 3.9+
* **Node.js:** 18+ (com npm)
* **Python:** 3.9+ (com pip)

---

## 📦 Instalação de Dependências

### 1. Backend (Java / Maven)
Na raiz do repositório:
```bash
mvn clean install -DskipTests
```

### 2. Frontend (Node / React)
Acesse a pasta `frontend` e instale os pacotes:
```bash
cd frontend
npm install
cd ..
```

### 3. Módulo Python
Instale os pacotes recomendados via `requirements.txt`:
```bash
pip install -r requirements.txt
```

---

## 🚀 Como Executar

### 1. Iniciar o Backend (API Spring Boot)
Na raiz do repositório, escolha **uma** das opções abaixo:

#### Opção A: Executar diretamente via Maven (Recomendado)
Não exige a geração prévia do arquivo `.jar`:
```bash
mvn spring-boot:run
```

#### Opção B: Compilar e executar via JAR Standalone
> ⚠️ **Atenção:** A pasta `target/` armazena artefatos compilados e é intencionalmente ignorada pelo Git (`.gitignore`). Se você acabou de baixar ou clonar o repositório, deve compilar o projeto antes de tentar rodar o `.jar`:

```bash
# 1. Compila o projeto e gera o arquivo JAR em target/
mvn clean package -DskipTests

# 2. Executa a aplicação a partir do JAR gerado
java -jar target/connectivity-forecast-api-1.0.0.jar
```

#### Opção C: Executar pela interface do VS Code
Se preferir executar sem o terminal ou se não tiver o Maven configurado no `PATH`:
1. Abra o arquivo `src/main/java/com/brazcubas/connectivityforecast/ConnectivityForecastApplication.java`.
2. Clique no botão **`Run`** (ou `Debug`) exibido diretamente acima do método `main`.

A API subirá em `http://localhost:8080`.

---

#### 🛠️ Resolução de Problemas Comuns no Backend
* **`Unable to access jarfile target/...jar`**: Significa que o arquivo `.jar` ainda não foi gerado nesta máquina. Execute `mvn clean package -DskipTests` primeiro (ou utilize a **Opção A**).
* **Erro de segurança no PowerShell (`PSSecurityException` / scripts desabilitados)**: Ocorre quando o PowerShell tenta rodar scripts de extensão (`debugjava.ps1`). Para rodar normalmente use `java -jar ...` (e não `debugjava`), ou libere a execução de scripts para seu usuário executando uma única vez:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
* **Comando `mvn` não reconhecido**: Instale o [Apache Maven](https://maven.apache.org/) e adicione-o ao `PATH` do sistema, ou utilize a **Opção C** (botão Run do VS Code).

### 2. Iniciar o Frontend Web (React / Vite)
Em um novo terminal:
```bash
cd frontend
npm run dev
```
A aplicação estará disponível em `http://localhost:5173`. O Vite já possui proxy configurado para encaminhar requisições `/api` diretamente para a porta `8080`.

### 3. Coletar Dados Históricos e Gerar Previsões de 48h (Python + ML)
Para coletar o histórico horário real (365 dias / 1 ano completo, 15 probes no Brasil) da API pública do RIPE Atlas e treinar os 4 modelos de Machine Learning (`LinearRegression`, `RandomForest`, `DecisionTree`, `GradientBoosting`) gerando as 2.880 previsões de 48h em `data/predictions.csv`:
```bash
# 1. Coleta o histórico horário (gera measurements_history.csv)
python src/ripeatlas.py

# 2. Treina os 4 modelos e adapta para as 15 colunas do Backend Java (gera data/predictions.csv)
python src/gerar_previsoes.py
```

### 4. Executar o Monitor ICMP Local (Python)
Em outro terminal (opcional para testes de monitoramento local de rede):
```bash
python main.py
```
O script executa ciclos de ping em hosts configurados, calcula RTT, Jitter e TTL, classifica a estabilidade do enlace e armazena os dados em `rede_monitoramento.db`.

### 5. Build e Sincronização Mobile (Android / Capacitor)
Para sincronizar as alterações da aplicação web com o projeto nativo Android:
```bash
cd frontend
npm run mobile:sync
```

---

## 📖 Documentação Interativa da API

Após iniciar o backend, acesse no navegador:
* **Swagger UI:** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
* **OpenAPI Docs (JSON):** [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

---

## 📌 Principais Endpoints (`/api/v1`)

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

## 🎯 Escopo e Características Técnicas

* **Simulação Local & Fixtures:** Dados de previsão carregados em memória a partir de `data/predictions.csv` (coletados originalmente via API pública do RIPE Atlas com 4 modelos ativos e histórico horários).
* **Telemetria Híbrida / RIPE Atlas:** Sincronização periódica com a rede pública global do RIPE Atlas para leitura de latência e perda de pacotes em tempo real.
* **Resiliência e Fallback Offline:** O frontend possui tolerância a falhas — se o backend Spring Boot estiver indisponível, ele ativa fallback em memória ou lê o CSV localmente.
* **Higiene de Versionamento:** Diretórios pesados como `node_modules/`, `target/`, builds móveis (`dist/`, `.apk`, `.aab`), cache do Gradle e bancos SQLite locais são gerados sob demanda e ignorados pelo `.gitignore`.

---

## 📄 Licença e Referências

* Reimplementação baseada na [API de referência](https://github.com/LiniiS/connectivity-forecast-api) sob licença MIT.
* Repositório do Squad Plancton: [APS II - ConnectTech](https://github.com/AlreadyDone675/Projeto-Plancton)
