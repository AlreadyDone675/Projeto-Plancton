# Connectivity Forecast API — ConnectTech

API REST desenvolvida em Java e Spring Boot para previsão e análise de qualidade de conexão de rede, desenvolvida para a disciplina de Análise e Projeto de Sistemas II (APS II — Squad Plancton).

---

## 🚀 Como Executar

### Pré-requisitos
- **Java 17+**
- **Maven 3.9+**

### Execução

```bash
# Rodar os testes
mvn test

# Iniciar o servidor
mvn spring-boot:run
```

A aplicação subirá em `http://localhost:8080`.

---

## 📖 Documentação Interativa

Após iniciar o servidor, acesse:
- **Swagger UI:** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **OpenAPI Docs (JSON):** [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

---

## 📌 Principais Endpoints (`/api/v1`)

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Estado de saúde da API |
| `GET` | `/api/v1/models` | Catálogo de modelos de predição |
| `GET` | `/api/v1/locations` | Lista de probes e localizações |
| `GET` | `/api/v1/forecasts/nearby` | Consulta de previsão por geolocalização |
| `POST` | `/api/v1/activity/check` | Validação de adequação para atividade |

---

## 🎯 Escopo e Características

- **Simulação Local:** Dados em memória com fixtures mockadas coletados pela api do RIPE atlas com um script em python (4 modelos ativos, 20 probes e 1920 previsões).
- **Sem Banco Externo:** Não depende de banco de dados nem serviços externos para execução local.
- **Arquitetura em Camadas:** Estruturada em Controllers, Services, Repositories e DTOs.

---

## 📄 Licença

Reimplementação baseada na [API de referência](https://github.com/LiniiS/connectivity-forecast-api) sob licença MIT.
