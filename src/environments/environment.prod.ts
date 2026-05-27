// Produção — usado pelo `ng build` (fileReplacements em angular.json).
// Configure URLs reais do backend de produção aqui.

export const environment = {
  production: true,

  /** URL da API em produção (browser/PWA). */
  apiBaseUrl: 'https://api.app-corretor.example.com/api',

  /** URL da API em produção (APK release). */
  apiBaseUrlNative: 'https://api.app-corretor.example.com/api',

  pushNativeEnabled: true,
};
