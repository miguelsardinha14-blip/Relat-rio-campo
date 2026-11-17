# Relatório de Campo — Congregação Alto da Serra (Petrópolis/RJ)

## Como gerar o arquivo APK (instalável no Android) e o AAB (Google Play Store)

Como este ambiente gera arquivos de código-fonte e não possui o Android SDK/Gradle instalado para compilar binários nativos diretamente, este pacote contém o **projeto Android nativo completo (Capacitor + React + Vite)** pronto para compilar o `.apk` e o `.aab`.

### Opção 1: Gerar APK automaticamente na nuvem (sem instalar nada no PC)
1. Crie um repositório no **GitHub** e envie os arquivos deste `.zip`.
2. Acesse a aba **Actions** do seu repositório no GitHub.
3. Clique em **Compilar APK e AAB Android** -> **Run workflow**.
4. Em cerca de 2 minutos, baixe o arquivo **`Relatorio-Campo-Alto-da-Serra-APK`** (`app-debug.apk`) diretamente na página da execução e instale no celular Android.

### Opção 2: Gerar APK e AAB localmente no computador
Pré-requisitos: Node.js 20+ e Android Studio instalados.
```bash
npm install
npm run build
npx cap add android
npx cap sync android
```
- **Para gerar o APK instalável:**
  ```bash
  cd android && ./gradlew assembleDebug
  ```
  O APK estará em: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Para gerar o AAB da Google Play Store:**
  ```bash
  cd android && ./gradlew bundleRelease
  ```
  O AAB estará em: `android/app/build/outputs/bundle/release/app-release.aab`
