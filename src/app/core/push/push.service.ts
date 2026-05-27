import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PUSH_NATIVE_ENABLED, apiUrl } from '../http/api.config';
import { TokenStorageService } from '../auth/token-storage.service';

const CHANNEL_ID = 'corretor-default';

@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);

  readonly currentToken = signal<string | null>(null);
  readonly lastNotification = signal<{ title?: string; body?: string } | null>(null);
  readonly enabled = signal(false);

  private initialized = false;

  async iniciar(): Promise<void> {
    if (this.initialized) return;
    if (!Capacitor.isNativePlatform()) {
      console.info('PushService: ambiente web — push desabilitado.');
      return;
    }
    if (!PUSH_NATIVE_ENABLED) {
      console.info('PushService: PUSH_NATIVE_ENABLED=false.');
      return;
    }
    try {
      // 1. Permissões — Push + Local Notifications
      const pushPerm = await PushNotifications.checkPermissions();
      let granted = pushPerm.receive === 'granted';
      if (pushPerm.receive === 'prompt' || pushPerm.receive === 'prompt-with-rationale') {
        const r = await PushNotifications.requestPermissions();
        granted = r.receive === 'granted';
      }
      if (!granted) {
        console.warn('PushService: permissão de push negada.');
        return;
      }

      // Local notifications precisa de permissão própria também (Android 13+)
      try {
        const lnPerm = await LocalNotifications.checkPermissions();
        if (lnPerm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
      } catch (err) {
        console.warn('PushService: local notifications permission falhou (ignorando)', err);
      }

      // 2. Recria channel SEM sound problemático (raw/default não existe no APK).
      //    Channels imutáveis após criados — precisa deletar primeiro.
      try {
        await PushNotifications.deleteChannel({ id: CHANNEL_ID });
      } catch {
        // não existia ainda, tudo bem
      }
      try {
        await PushNotifications.createChannel({
          id: CHANNEL_ID,
          name: 'App Corretor — geral',
          description: 'Status de propostas, pagamentos e alertas',
          importance: 5, // IMPORTANCE_MAX (heads-up + som padrão do sistema)
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: '#3880ff',
          // sem `sound` → Android usa som de notification padrão do sistema
        });
        // Cria também no LocalNotifications para que ele use o mesmo channel
        await LocalNotifications.createChannel({
          id: CHANNEL_ID,
          name: 'App Corretor — geral',
          description: 'Status de propostas, pagamentos e alertas',
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: '#3880ff',
        });
        console.info('PushService: channel recriado sem sound problemático.');
      } catch (err) {
        console.warn('PushService: falha ao criar channel (não crítico)', err);
      }

      // 3. Listeners (antes de register)
      await PushNotifications.removeAllListeners();

      await PushNotifications.addListener('registration', async (token: Token) => {
        this.currentToken.set(token.value);
        await this.registrarNoBackend(token.value);
        console.info('PushService: token registrado.');
      });

      await PushNotifications.addListener('registrationError', (err) => {
        console.error('PushService: erro de registration', err);
      });

      // Em foreground: FCM NÃO mostra notification automática.
      // Solução: criar Local Notification programaticamente.
      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notif: PushNotificationSchema) => {
          this.lastNotification.set({ title: notif.title, body: notif.body });
          console.info('PushService: notification recebida (foreground)', notif);
          this.showLocalNotification(notif);
        },
      );

      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          console.info('PushService: ação executada', action);
          this.handleAction(action);
        },
      );

      // Local notification tap também navega
      try {
        await LocalNotifications.addListener(
          'localNotificationActionPerformed',
          (action) => {
            const data = action.notification.extra as Record<string, string> | undefined;
            this.handleAction({
              actionId: 'tap',
              notification: {
                title: action.notification.title ?? '',
                body: action.notification.body ?? '',
                id: String(action.notification.id),
                data: data ?? {},
              },
            } as ActionPerformed);
          },
        );
      } catch (err) {
        console.warn('PushService: local notification listener falhou', err);
      }

      // 4. Registra no FCM
      await PushNotifications.register();
      this.initialized = true;
      this.enabled.set(true);
    } catch (err) {
      console.error('PushService: falha ao iniciar', err);
    }
  }

  /**
   * Quando push chega em foreground, FCM não mostra automática.
   * Criamos local notification para garantir visibilidade.
   */
  private async showLocalNotification(notif: PushNotificationSchema): Promise<void> {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() / 1000) % 2_000_000_000,
            title: notif.title ?? 'App Corretor',
            body: notif.body ?? '',
            channelId: CHANNEL_ID,
            smallIcon: 'ic_stat_icon_config_sample',
            extra: notif.data ?? {},
            schedule: { at: new Date(Date.now() + 100) },
          },
        ],
      });
    } catch (err) {
      console.error('PushService: falha ao mostrar local notification', err);
    }
  }

  async desligar(): Promise<void> {
    const token = this.currentToken();
    if (token) {
      try {
        await firstValueFrom(
          this.http.request('DELETE', apiUrl('/push/register-token'), {
            body: { fcmToken: token },
          }),
        );
      } catch {
        // ignora
      }
    }
    if (Capacitor.isNativePlatform()) {
      try {
        await PushNotifications.removeAllListeners();
        await LocalNotifications.removeAllListeners();
      } catch {
        // ignora
      }
    }
    this.currentToken.set(null);
    this.enabled.set(false);
    this.initialized = false;
  }

  async enviarTeste(): Promise<{ sent: number }> {
    return firstValueFrom(
      this.http.post<{ sent: number }>(apiUrl('/push/test'), {}),
    );
  }

  /** Útil para debug: dispara uma local notification direto sem ir ao FCM. */
  async dispararLocalDebug(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100000),
          title: '🧪 Local debug',
          body: 'Notification local — testa se aparece sem passar pelo FCM',
          channelId: CHANNEL_ID,
          schedule: { at: new Date(Date.now() + 500) },
        },
      ],
    });
  }

  private async registrarNoBackend(fcmToken: string): Promise<void> {
    const deviceId = await this.storage.getOrCreateDeviceId();
    const deviceName = this.guessDeviceName();
    try {
      await firstValueFrom(
        this.http.post(apiUrl('/push/register-token'), {
          fcmToken,
          deviceId,
          deviceName,
          platform: 'ANDROID',
        }),
      );
    } catch (err) {
      console.error('PushService: falha ao registrar no backend', err);
    }
  }

  private handleAction(action: ActionPerformed): void {
    const data = action.notification?.data as Record<string, string> | undefined;
    if (!data) return;
    if (data['tipo'] === 'proposta' && data['propostaId']) {
      void this.router.navigate(['/propostas', data['propostaId']]);
    }
  }

  private guessDeviceName(): string {
    return typeof navigator !== 'undefined'
      ? `${navigator.platform || 'device'}`.slice(0, 100)
      : 'unknown device';
  }
}
