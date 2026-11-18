# ConnectTech - Versão Expo Mobile & Web

Projeto adaptado para o ecossistema **Expo**, permitindo apresentação tanto no **Navegador Web** (com simulador de celular ou tela cheia) quanto em dispositivos móveis via **Expo Go**.

---

## 🚀 Como Executar na Web (Apresentação da Faculdade)

1. Abra o terminal na pasta `expo-connecttech`:
   ```bash
   cd expo-connecttech
   ```

2. Inicie o servidor Expo no modo Web:
   ```bash
   npm run web
   ```
   *(ou `npx expo start --web`)*

3. O navegador abrirá automaticamente em `http://localhost:8081`.

---

## 📱 Recursos na Apresentação Web

- **📱 Modo Celular:** Exibe o app dentro de uma moldura realista de smartphone (com notch e cantos arredondados).
- **🖥️ Modo Tela Cheia:** Permite alternar para tela cheia para mostrar todos os detalhes em monitores ou projetores.
- **🗺️ Mapa Interativo (Leaflet):** 15 Probes reais do RIPE Atlas espalhadas pelo Brasil (São Paulo, Rio, Brasília, etc.).
- **📊 Modelos de Machine Learning:** Alternância entre Modelo A, B, C e D com gráficos e métricas de qualidade (Bom, Moderado, Instável).
- **🔄 Dados Mockados:** 100% funcional offline para a apresentação, sem necessidade de banco de dados ou backend Java/Python ativos.
- **🎨 Configurações:** Suporte a Tema Claro / Escuro, Alto Contraste e ajuste de tamanho de fonte.

---

## 🔄 Como Atualizar se você alterar o código do Frontend

Se você fizer alterações no código em `../frontend/src`:

1. Recompile o frontend:
   ```bash
   cd ../frontend
   npm run build
   ```

2. Copie para a pasta do Expo:
   ```powershell
   Copy-Item -Path dist\* -Destination ..\expo-connecttech\public\app -Recurse -Force
   ```
