import { Injectable } from '@angular/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

const KEYCHAIN_SERVER = 'app-corretor:biometric';

export interface StoredBiometric {
  credentialId: string;
  biometricToken: string;
}

@Injectable({ providedIn: 'root' })
export class BiometricService {
  /** True somente em device nativo com biometria configurada. */
  async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const res = await NativeBiometric.isAvailable();
      return !!res.isAvailable;
    } catch {
      return false;
    }
  }

  /**
   * Pede biometria ao usuário (FaceID/TouchID/Android Biometric).
   * Resolve em sucesso; rejeita em falha/cancelamento.
   */
  async verifyIdentity(
    reason = 'Confirme sua identidade para acessar o app',
  ): Promise<void> {
    await NativeBiometric.verifyIdentity({
      reason,
      title: 'App Corretor',
      subtitle: 'Autenticação biométrica',
      description: reason,
      useFallback: true,
    });
  }

  /** Salva credencial no Keychain/Keystore protegido por biometria. */
  async store(credentialId: string, biometricToken: string): Promise<void> {
    await NativeBiometric.setCredentials({
      server: KEYCHAIN_SERVER,
      username: credentialId,
      password: biometricToken,
    });
  }

  /** Recupera credencial salva — DEVE ser precedido por verifyIdentity(). */
  async retrieve(): Promise<StoredBiometric> {
    const { username, password } = await NativeBiometric.getCredentials({
      server: KEYCHAIN_SERVER,
    });
    return { credentialId: username, biometricToken: password };
  }

  async clear(): Promise<void> {
    try {
      await NativeBiometric.deleteCredentials({ server: KEYCHAIN_SERVER });
    } catch {
      // ignore — nada salvo
    }
  }
}
