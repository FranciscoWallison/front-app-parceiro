import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { keyOutline, mailOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-esqueci-senha',
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonIcon,
    IonSpinner,
    IonText,
  ],
  templateUrl: './esqueci-senha.page.html',
  styleUrls: ['./esqueci-senha.page.scss'],
})
export class EsqueciSenhaPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  stage = signal<'cpf' | 'token'>('cpf');
  cpf = '';
  token = '';
  novaSenha = '';
  busy = signal(false);
  notice = signal<string | null>(null);
  error = signal<string | null>(null);

  constructor() {
    addIcons({ mailOutline, keyOutline });
  }

  async pedirToken(): Promise<void> {
    if (!this.cpf) {
      this.error.set('Informe o CPF.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.forgotPassword(this.cpf);
      this.notice.set(
        'Se o CPF estiver cadastrado, enviamos um e-mail com o token de recuperação. Cole-o abaixo para continuar.',
      );
      this.stage.set('token');
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Falha.');
    } finally {
      this.busy.set(false);
    }
  }

  async resetar(): Promise<void> {
    if (!this.token || !this.novaSenha) {
      this.error.set('Informe token e nova senha.');
      return;
    }
    if (this.novaSenha.length < 6) {
      this.error.set('Senha deve ter ao menos 6 caracteres.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.resetPassword(this.token, this.novaSenha);
      this.notice.set('Senha atualizada. Você pode fazer login agora.');
      setTimeout(() => void this.router.navigate(['/login']), 1500);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Falha ao resetar.');
    } finally {
      this.busy.set(false);
    }
  }
}
