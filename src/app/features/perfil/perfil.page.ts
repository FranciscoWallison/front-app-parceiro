import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  notificationsOutline,
  pencilOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/auth/auth.service';
import { PushService } from '../../core/push/push.service';
import { TelefoneMaskDirective } from '../../shared/masks/mask.directives';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { StatusPillComponent } from '../../shared/ui/status-pill.component';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    FormsModule,
    TelefoneMaskDirective,
    IonContent,
    IonIcon,
    IonSpinner,
    PageHeaderComponent,
    StatusPillComponent,
  ],
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
})
export class PerfilPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly push = inject(PushService);
  private readonly route = inject(ActivatedRoute);

  user = this.auth.user;
  editing = signal(false);
  busy = signal(false);
  notice = signal<string | null>(null);
  error = signal<string | null>(null);
  hasBiometric = this.auth.hasBiometricLocally;
  biometricAvailable = signal(false);
  pushEnabled = this.push.enabled;

  iniciais = computed(() => {
    const nome = this.user()?.nome ?? '';
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  });

  form = { nome: '', email: '', telefone: '' };

  constructor() {
    addIcons({ pencilOutline, checkmarkCircleOutline, notificationsOutline });
  }

  async ngOnInit(): Promise<void> {
    this.biometricAvailable.set(await this.auth.isBiometricAvailable());
    const u = this.user();
    if (u) {
      this.form = { nome: u.nome, email: u.email, telefone: '' };
    }
    // Rola até a seção quando vindo do chat ai (ex: /perfil#biometria)
    this.route.fragment.subscribe((frag) => {
      if (!frag) return;
      setTimeout(() => {
        const el = document.getElementById(frag);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    });
  }

  iniciarEdit(): void {
    const u = this.user();
    if (u) this.form = { nome: u.nome, email: u.email, telefone: '' };
    this.editing.set(true);
    this.notice.set(null);
    this.error.set(null);
  }

  cancelarEdit(): void {
    this.editing.set(false);
    this.error.set(null);
  }

  async salvar(): Promise<void> {
    this.busy.set(true);
    this.notice.set(null);
    this.error.set(null);
    try {
      await this.auth.updateProfile(this.form);
      this.notice.set('Perfil atualizado.');
      this.editing.set(false);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      this.busy.set(false);
    }
  }

  async toggleBiometric(): Promise<void> {
    this.busy.set(true);
    this.notice.set(null);
    try {
      if (this.hasBiometric()) {
        await this.auth.removeBiometric();
        this.notice.set('Biometria removida.');
      } else {
        await this.auth.enrollBiometric();
        this.notice.set('Biometria habilitada.');
      }
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Falha.');
    } finally {
      this.busy.set(false);
    }
  }

  async testarPush(): Promise<void> {
    this.busy.set(true);
    this.notice.set(null);
    this.error.set(null);
    try {
      const res = await this.push.enviarTeste();
      this.notice.set(
        res.sent > 0
          ? `Push enviado para ${res.sent} device(s). Pode levar alguns segundos para chegar.`
          : 'Nenhum device registrado. Faça login no app nativo (não web) para registrar.',
      );
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Falha ao enviar.');
    } finally {
      this.busy.set(false);
    }
  }
}
