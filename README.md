# Connectivity Forecast API

Reimplementação Java/Spring Boot da [API de referência](https://github.com/LiniiS/connectivity-forecast-api), usada como artefato educacional de APS II.

## Executar

Requisitos: Java 17 e Maven 3.9+.

```bash
mvn test
mvn spring-boot:run
```

Swagger UI: `http://localhost:8080/swagger-ui.html`  
OpenAPI: `http://localhost:8080/v3/api-docs`

## Escopo

API local com catálogo de modelos e previsões mockadas. Fixture igual à referência: 4 modelos ativos, 10 probes e 24 instantes (960 previsões); catálogo também contém modelo inativo. Dados fictícios. Não consulta RIPE Atlas, não treina nem executa modelos, não usa banco de dados e não exige deploy. Classificação e recomendações são regras experimentais, não padrões científicos.

## Estrutura

Separação em controllers, services, repositories, modelos de domínio/DTOs e configuração. API versionada em `/api/v1`, com recursos de health, modelos, localizações, previsões e atividades.

## Documentação

README e OpenAPI são pontos de partida. Completar em exercício: descrição dos endpoints, parâmetros e validações, exemplos de requisição/resposta, códigos de erro e origem dos campos. Referência à licença MIT da API de origem preservada neste projeto.
