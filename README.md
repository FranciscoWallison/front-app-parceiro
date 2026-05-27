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

## Quickstart

### 1. Pré-requisitos
- Node.js 22+
- npm 11+
- Para APK Android: Android Studio (com SDK 35+ instalado) + Java JDK 21
- **Backend rodando** — repositório: https://github.com/FranciscoWallison/back-app-parceiro

### 2. Configurar IP do backend

Edite [src/environments/environment.ts](src/environments/environment.ts) e troque o IP em `apiBaseUrlNative` para o **IP da sua máquina dev na LAN** (descubra com `ipconfig` no Windows ou `ifconfig` no Linux/Mac):

```typescript
apiBaseUrlNative: 'http://192.168.1.42:13000/api', // ← seu IP aqui
```

> Para produção, edite `environment.prod.ts` com o domínio público.

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
