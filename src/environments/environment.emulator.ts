// Build target para o emulador Android (AVD do Android Studio).
// 10.0.2.2 é o gateway interno do AVD que aponta para `localhost` do host.
// Use com: `ng build --configuration=emulator`.

export const environment = {
  production: false,

  /** URL da API quando rodando no browser (ionic serve). */
  apiBaseUrl: 'http://10.0.2.2:13000/api',

  /** URL da API quando rodando como APK debug no AVD. */
  apiBaseUrlNative: 'http://10.0.2.2:13000/api',

  pushNativeEnabled: true,
};
