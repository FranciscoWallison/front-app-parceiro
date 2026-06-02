// Produção — usado pelo `ng build --configuration=production` (fileReplacements em angular.json).
//
// IMPORTANTE: estes valores apontam para o BACKEND DE DEV NA LAN (192.168.100.6:13000)
// para permitir smoke test do APK release no device físico.
// Antes de publicar na Play Store, troque para a URL HTTPS pública real do backend.

export const environment = {
  production: true,

  /** URL da API em produção (browser/PWA). */
  apiBaseUrl: 'http://192.168.100.6:13000/api',

  /** URL da API em produção (APK release). */
  apiBaseUrlNative: 'http://192.168.100.6:13000/api',

  pushNativeEnabled: true,
};
