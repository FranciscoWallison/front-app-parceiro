import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

/**
 * URL base da API. As URLs reais vêm de `src/environments/environment.ts`
 * (dev) ou `environment.prod.ts` (build de produção).
 *
 * - **Browser / Ionic serve**: `environment.apiBaseUrl` (default localhost:13000)
 * - **APK nativo**: `environment.apiBaseUrlNative` (IP da LAN ou domínio público)
 */
export const API_BASE_URL = Capacitor.isNativePlatform()
  ? environment.apiBaseUrlNative
  : environment.apiBaseUrl;

export function apiUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${clean}`;
}

/**
 * Push notifications via Firebase Cloud Messaging.
 * Configurado em `environment.pushNativeEnabled`.
 *
 * REQUER `android/app/google-services.json` instalado + plugin gms aplicado
 * em `android/app/build.gradle`. Sem isso, deixe `false` — register() crasha
 * o app nativo com `Default FirebaseApp is not initialized`.
 */
export const PUSH_NATIVE_ENABLED = environment.pushNativeEnabled;
