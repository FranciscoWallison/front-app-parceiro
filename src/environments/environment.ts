// Dev (default) — substituído por environment.prod.ts no build de produção.
// IMPORTANTE: para rodar o APK em device físico, troque `apiBaseUrlNative`
// para o IP da sua máquina dev na LAN (ex: 192.168.1.42:13000).

export const environment = {
  production: false,

  /** URL da API quando rodando no browser (ionic serve, web build). */
  apiBaseUrl: 'http://localhost:13000/api',

  /** URL da API quando rodando como APK nativo no device físico (LAN). */
  apiBaseUrlNative: 'http://192.168.100.6:13000/api',

  /**
   * Push notifications via Firebase Cloud Messaging.
   * REQUER `android/app/google-services.json` instalado + plugin gms aplicado.
   * Sem isso, deixe `false` — register() crasha o app nativo.
   */
  pushNativeEnabled: true,
};
