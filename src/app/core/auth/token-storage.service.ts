import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { AuthTokens, UserProfile } from './auth.types';

const KEY_ACCESS = 'auth.access_token';
const KEY_REFRESH = 'auth.refresh_token';
const KEY_USER = 'auth.user';
const KEY_DEVICE_ID = 'device.id';
const KEY_BIO_CREDENTIAL_ID = 'biometric.credential_id';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  async saveSession(tokens: AuthTokens, user: UserProfile): Promise<void> {
    await Promise.all([
      Preferences.set({ key: KEY_ACCESS, value: tokens.accessToken }),
      Preferences.set({ key: KEY_REFRESH, value: tokens.refreshToken }),
      Preferences.set({ key: KEY_USER, value: JSON.stringify(user) }),
    ]);
  }

  async saveTokens(tokens: AuthTokens): Promise<void> {
    await Promise.all([
      Preferences.set({ key: KEY_ACCESS, value: tokens.accessToken }),
      Preferences.set({ key: KEY_REFRESH, value: tokens.refreshToken }),
    ]);
  }

  async getAccessToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: KEY_ACCESS });
    return value;
  }

  async getRefreshToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: KEY_REFRESH });
    return value;
  }

  async getUser(): Promise<UserProfile | null> {
    const { value } = await Preferences.get({ key: KEY_USER });
    return value ? (JSON.parse(value) as UserProfile) : null;
  }

  async clearSession(): Promise<void> {
    await Promise.all([
      Preferences.remove({ key: KEY_ACCESS }),
      Preferences.remove({ key: KEY_REFRESH }),
      Preferences.remove({ key: KEY_USER }),
    ]);
  }

  async getOrCreateDeviceId(): Promise<string> {
    const existing = await Preferences.get({ key: KEY_DEVICE_ID });
    if (existing.value) return existing.value;
    const id = crypto.randomUUID();
    await Preferences.set({ key: KEY_DEVICE_ID, value: id });
    return id;
  }

  async getBiometricCredentialId(): Promise<string | null> {
    const { value } = await Preferences.get({ key: KEY_BIO_CREDENTIAL_ID });
    return value;
  }

  async setBiometricCredentialId(credentialId: string | null): Promise<void> {
    if (credentialId) {
      await Preferences.set({ key: KEY_BIO_CREDENTIAL_ID, value: credentialId });
    } else {
      await Preferences.remove({ key: KEY_BIO_CREDENTIAL_ID });
    }
  }
}
