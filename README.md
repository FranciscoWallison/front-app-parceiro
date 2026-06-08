# App Corretor — Frontend

App mobile para corretores de adesão (PF + PME), com **proposta odonto em ≤8 minutos**:
cotação → câmera para docs → glass signature → PIX → transmissão → push de status.

## Stack

- **Ionic 8** + **Angular 20** (standalone components + signals)
- **Capacitor 8** (Android nativo)
- **@capacitor/camera** + Canvas API (compressão ≤500KB)
- **signature_pad** + **pdf-lib** (glass signature + PDF assinado)
- **@capacitor/push-notifications** + **@capacitor/local-notifications** (FCM)
- **@capgo/capacitor-native-biometric** (FaceID/TouchID/Android Biometric)
- **@capacitor/preferences** (storage chave/valor)
- **qrcode** (QR PIX visual)
- **signature_pad** (glass signature canvas)

## Features

- Login CPF+senha com biometria opcional + refresh token rotation
- Wizard PF (5 passos) e PME (4 passos) com máscaras automáticas + ViaCEP autopreenchimento
- Validação CPF/CNPJ client-side (algoritmo DV)
- Câmera nativa para documentos com compressão automática
- Glass signature em canvas full-screen + PDF assinado
- Pagamento PIX com QR Code visual + polling automático até confirmação
- Push notifications real (FCM) com deeplink para detalhe da proposta
- Tela admin para aprovar/recusar propostas TRANSMITIDAS
- Telas secundárias: perfil, materiais, contato, FAQ, esqueci-senha
- **Chat com IA Gemini** que entende linguagem natural e **navega/aciona telas** via protocolo de handoff (ver [doc/HANDOFFS.md](../doc/HANDOFFS.md))

## Quickstart

### 1. Pré-requisitos
- Node.js 22+
- npm 11+
- Para APK Android: Android Studio (com SDK 35+ instalado) + Java JDK 21
- **Backend rodando** — repositório: https://github.com/FranciscoWallison/back-app-parceiro

### 2. Configurar IP do backend (3 configurações Angular)

O Angular usa **fileReplacements** para trocar `environment.ts` pelo arquivo apropriado conforme o alvo do build:

| Configuração | Arquivo | Onde aponta | Quando usar |
|---|---|---|---|
| `development` (default `ng serve`) | [environment.ts](src/environments/environment.ts) | IP da LAN (192.168.x) | Dev no browser + APK release no device físico |
| `emulator` | [environment.emulator.ts](src/environments/environment.emulator.ts) | `10.0.2.2:13000` (gateway do AVD) | Emulador Android Studio |
| `production` | [environment.prod.ts](src/environments/environment.prod.ts) | HTTPS público (futuro Play Store) | Release final |

Para device físico, edite o IP em [environment.ts](src/environments/environment.ts) e [environment.prod.ts](src/environments/environment.prod.ts) com seu IP da LAN (descubra com `ipconfig` no Windows ou `ifconfig` no Linux/Mac):

```typescript
apiBaseUrlNative: 'http://192.168.1.42:13000/api', // ← seu IP aqui
```

Para o emulador, **não precisa mexer** — `environment.emulator.ts` já aponta para `10.0.2.2`.

### 2b. Scripts úteis

```bash
npm run build:emulator     # ng build --configuration=emulator + cap sync
npm run apk:emulator       # build:emulator + gradlew assembleDebug
```

### 3. Instalar deps e rodar no browser

```bash
npm install
npm start              # ou: ionic serve
# Abre http://localhost:4200
```

### 4. Build do APK Android

```bash
# Gera build estático (vai para /www)
npm run build

# Sincroniza www → android/app/src/main/assets/public + plugins nativos
npx cap sync android

# Build do APK debug
cd android
./gradlew assembleDebug
# APK gerado em: android/app/build/outputs/apk/debug/app-debug.apk
```

### 5. Instalar no device físico

Com o cabo USB conectado e modo desenvolvedor ativo:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am force-stop io.appcorretor.mobile
adb shell monkey -p io.appcorretor.mobile -c android.intent.category.LAUNCHER 1
```

⚠️ O device precisa estar na **mesma rede WiFi** que a máquina onde o backend roda. O firewall do Windows precisa liberar a porta `13000` se for a primeira vez.

### 6. Usuários de teste (já seedados no backend)

| CPF | Senha |
|---|---|
| `12345678909` | `senha123` |
| `11144477735` | `senha123` |

## Chat com IA (Gemini Function Calling)

O app tem uma rota `/chat` (CTA "Criar com IA" na home) onde o corretor digita em linguagem natural. O backend NestJS proxia para o Gemini API com **function calling** — o LLM decide quais funções chamar e o frontend reage.

### Protocolo de handoff

Algumas tools do backend **não executam ação no servidor**, apenas retornam um descritor `{ handoff: { kind, ...payload } }`. O frontend recebe esse descritor e o `ChatHandoffResolver` ([core/ai/chat-handoff.resolver.ts](src/app/core/ai/chat-handoff.resolver.ts)) executa a ação correspondente:

| Handoff `kind` | Ação | Confirma? |
|---|---|:---:|
| `OPEN_PROPOSTA_DETALHE` | Navega `/propostas/:id` | — |
| `OPEN_WIZARD_PF` / `OPEN_WIZARD_PME` | Navega o wizard correspondente | — |
| `OPEN_LISTA_PROPOSTAS` | Navega `/propostas` com queryParams `status` / `tipo` | — |
| `OPEN_ADMIN` | Navega `/admin/propostas` | — |
| `OPEN_PERFIL` | Navega `/perfil` + rola até `#biometria` ou `#push` | — |
| `SHOW_TOAST` | `ToastController` 3s com cor por tone | — |
| `OPEN_CAMERA` | Confirma → `Camera.getPhoto` → upload → navega para o detalhe | **✓** |
| `OPEN_SIGNATURE_MODAL` | Confirma → modal signature_pad → `PropostasService.assinar` | **✓** |
| `DO_LOGOUT` | Confirma → `AuthService.logout()` → `/login` | **✓** |

Detalhes de arquitetura, segurança e como adicionar tools novas em [doc/HANDOFFS.md](../doc/HANDOFFS.md).

## Voz no chat (STT)

O chat tem um **botão de microfone** ao lado do "Enviar" que captura voz em pt-BR via **Azure AI Speech**. O texto reconhecido entra no MESMO `enviar()` que o usuário usa digitando — IA processa identicamente.

### Como funciona

- O backend NestJS expõe `POST /ai/speech/token` que devolve um **token Azure efêmero (10min)** — a chave Azure NUNCA toca o APK.
- Frontend usa `SpeechConfig.fromAuthorizationToken(token, region)` para abrir WebSocket direto com Azure (latência baixa, transcrição parcial em tempo real).
- `recognizing` → texto cinza-itálico no footer. `recognized` (pausa final detectada) → texto vai pro input e dispara `enviar()` automaticamente.

### Patch obrigatório

O SDK Azure Speech (`microsoft-cognitiveservices-speech-sdk@1.49`) puxa um `https-proxy-agent` antigo Node-only que o esbuild do Angular 20 não tree-shake. O script [`scripts/patch-azure-sdk.js`](scripts/patch-azure-sdk.js) sobrescreve esse módulo com stubs vazios (o SDK já marca como `browser: false`, apenas não chamado em runtime). Roda automaticamente via `npm postinstall`.

### Configurar backend

Veja [doc/VOICE.md](../doc/VOICE.md) — criar recurso Azure Speech, colar `AZURE_SPEECH_KEY` no `.env` do backend, `docker compose up -d --force-recreate backend`.

Sem essa env, o endpoint do backend retorna 503 e o frontend mostra toast "Voz indisponível: configure AZURE_SPEECH_KEY no servidor".

### Permissão Android

[AndroidManifest.xml](android/app/src/main/AndroidManifest.xml) declara `RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS`. A primeira vez que tocar no mic, o Android pede permissão — toca "Permitir".

## Push notifications

Para push REAL chegar no APK:

### 1. `google-services.json` (Firebase Console)
1. https://console.firebase.google.com → seu projeto → ⚙ Settings → "Your apps" → **Add app → Android**
2. Package name: **`io.appcorretor.mobile`** (tem que bater EXATO com `appId` do `capacitor.config.ts`)
3. Baixe o `google-services.json` e coloque em `android/app/google-services.json`

### 2. Service Account no backend
Veja README do backend ou [doc/SETUP-PUSH-NOTIFICATIONS.md](https://github.com/FranciscoWallison/back-app-parceiro/blob/main/doc/SETUP-PUSH-NOTIFICATIONS.md) (no monorepo original).

### 3. Ativar flag
Em [src/environments/environment.ts](src/environments/environment.ts), confirme `pushNativeEnabled: true`.

### 4. Rebuild
```bash
npm run build && npx cap sync android && cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

⚠️ **Sem `google-services.json`** o app crasha ao tentar registrar push. Mantenha `pushNativeEnabled: false` até configurar.

## Estrutura

```
src/app/
├── core/
│   ├── auth/          # Login, refresh, biometria, password reset
│   ├── cep/           # ViaCEP autopreenchimento
│   ├── contato/, faq/, materiais/    # Services secundários
│   ├── dashboard/     # Contadores + últimas propostas
│   ├── documentos/    # Camera + compressão Canvas + upload multipart
│   ├── http/          # api.config + auth.interceptor
│   ├── planos/        # Catálogo
│   ├── propostas/     # Service principal + tipos
│   └── push/          # FCM register + listeners + local notifications
├── features/
│   ├── admin/         # Aprovar/recusar propostas (operadora simulada)
│   ├── auth/          # Esqueci senha
│   ├── contato/, faq/, materiais/, perfil/   # Telas secundárias
│   ├── login/         # Auth UI
│   └── propostas/
│       ├── nova-pf/, nova-pme/   # Wizards
│       ├── lista/, detalhe/      # Listagem + detalhe com FSM
├── home/              # Dashboard
└── shared/
    ├── masks/         # Directives + validators CPF/CNPJ/CEP/telefone
    └── signature/     # Modal com signature_pad full-screen
```

## Backend (repositório separado)

https://github.com/FranciscoWallison/back-app-parceiro

Sobe stack docker com Postgres + Redis + MinIO + RabbitMQ + MailHog + NestJS via `docker compose up -d --build`.

## License

Proprietary — App Corretor MVP.
