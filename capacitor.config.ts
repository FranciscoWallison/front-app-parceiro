import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.appcorretor.mobile',
  appName: 'App Corretor',
  webDir: 'www',
  android: {
    // Permite HTTP (não-HTTPS) — necessário em dev contra backend local.
    // Em produção, sirva o backend via HTTPS e desligue isso.
    allowMixedContent: true,
  },
  server: {
    // Permite HTTP cleartext (mesmo motivo acima).
    cleartext: true,
    androidScheme: 'http',
  },
};

export default config;
