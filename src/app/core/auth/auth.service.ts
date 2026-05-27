import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../http/api.config';
import { PushService } from '../push/push.service';
import { BiometricService } from './biometric.service';
import {
  AuthResponse,
  AuthTokens,
  BiometricCredential,
  EnrollResponse,
  UserProfile,
} from './auth.types';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);
  private readonly biometric = inject(BiometricService);
  private readonly push = inject(PushService);

  /** signal interno com o user atual (null = não logado). */
  private readonly userSignal = signal<UserProfile | null>(null);
  /** signal exposto somente leitura. */
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly hasBiometricLocally = signal<boolean>(false);

  async bootstrap(): Promise<void> {
    const [user, credId] = await Promise.all([
      this.storage.getUser(),
      this.storage.getBiometricCredentialId(),
    ]);
    if (user) {
      this.userSignal.set(user);
      // Sessão restaurada do storage — registra/atualiza FCM token também
      void this.push.iniciar();
    }
    this.hasBiometricLocally.set(!!credId);
  }

  async login(cpf: string, senha: string): Promise<UserProfile> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(apiUrl(`/auth/login`), { cpf, senha }),
    );
    await this.storage.saveSession(res, res.user);
    this.userSignal.set(res.user);
    void this.push.iniciar();
    return res.user;
  }

  async logout(): Promise<void> {
    const refreshToken = await this.storage.getRefreshToken();
    if (refreshToken) {
      try {
        await firstValueFrom(
          this.http.post(apiUrl(`/auth/logout`), { refreshToken }),
        );
      } catch {
        // logout é idempotente — não bloqueia o flush local
      }
    }
    await this.push.desligar();
    await this.storage.clearSession();
    this.userSignal.set(null);
  }

  async refreshTokens(): Promise<AuthTokens> {
    const refreshToken = await this.storage.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(apiUrl(`/auth/refresh`), { refreshToken }),
    );
    await this.storage.saveSession(res, res.user);
    this.userSignal.set(res.user);
    return { accessToken: res.accessToken, refreshToken: res.refreshToken };
  }

  // ------------------------------------------------------------------
  // Biometric
  // ------------------------------------------------------------------

  async isBiometricAvailable(): Promise<boolean> {
    return this.biometric.isAvailable();
  }

  /** Pós-login: pergunta e habilita biometria neste device. */
  async enrollBiometric(): Promise<void> {
    if (!(await this.biometric.isAvailable())) {
      throw new Error('Biometria não disponível neste device.');
    }
    const deviceId = await this.storage.getOrCreateDeviceId();
    await this.biometric.verifyIdentity('Confirme para habilitar biometria');

    const res = await firstValueFrom(
      this.http.post<EnrollResponse>(apiUrl(`/auth/biometric/enroll`), {
        deviceId,
        deviceName: this.guessDeviceName(),
      }),
    );

    await this.biometric.store(res.credentialId, res.biometricToken);
    await this.storage.setBiometricCredentialId(res.credentialId);
    this.hasBiometricLocally.set(true);
  }

  /** Login subsequente: usa biometria já cadastrada. */
  async loginWithBiometric(): Promise<UserProfile> {
    if (!(await this.biometric.isAvailable())) {
      throw new Error('Biometria não disponível neste device.');
    }
    await this.biometric.verifyIdentity('Entrar com biometria');
    const { credentialId, biometricToken } = await this.biometric.retrieve();
    const deviceId = await this.storage.getOrCreateDeviceId();

    const res = await firstValueFrom(
      this.http.post<AuthResponse>(apiUrl(`/auth/biometric/login`), {
        credentialId,
        biometricToken,
        deviceId,
      }),
    );
    await this.storage.saveSession(res, res.user);
    this.userSignal.set(res.user);
    void this.push.iniciar();
    return res.user;
  }

  async listBiometricCredentials(): Promise<BiometricCredential[]> {
    return firstValueFrom(
      this.http.get<BiometricCredential[]>(apiUrl(`/auth/biometric`)),
    );
  }

  async updateProfile(payload: { nome?: string; email?: string; telefone?: string }): Promise<UserProfile> {
    const updated = await firstValueFrom(
      this.http.patch<UserProfile>(apiUrl('/users/me'), payload),
    );
    this.userSignal.set(updated);
    await this.storage.saveSession(
      {
        accessToken: (await this.storage.getAccessToken()) ?? '',
        refreshToken: (await this.storage.getRefreshToken()) ?? '',
      },
      updated,
    );
    return updated;
  }

  async forgotPassword(cpf: string): Promise<void> {
    await firstValueFrom(
      this.http.post(apiUrl('/auth/forgot-password'), { cpf }),
    );
  }

  async resetPassword(token: string, novaSenha: string): Promise<void> {
    await firstValueFrom(
      this.http.post(apiUrl('/auth/reset-password'), { token, novaSenha }),
    );
  }

  async removeBiometric(): Promise<void> {
    const credId = await this.storage.getBiometricCredentialId();
    if (credId) {
      try {
        await firstValueFrom(
          this.http.delete(apiUrl(`/auth/biometric/${credId}`)),
        );
      } catch {
        // continua mesmo se backend já não tiver a credencial
      }
    }
    await this.biometric.clear();
    await this.storage.setBiometricCredentialId(null);
    this.hasBiometricLocally.set(false);
  }

  private guessDeviceName(): string {
    return typeof navigator !== 'undefined'
      ? `${navigator.platform || 'device'} (${navigator.userAgent.slice(0, 40)})`
      : 'unknown device';
  }
}
