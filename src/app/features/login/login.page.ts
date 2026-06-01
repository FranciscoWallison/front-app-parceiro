import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { fingerPrint } from 'ionicons/icons';
import { AuthService } from '../../core/auth/auth.service';
import { CpfMaskDirective } from '../../shared/masks/mask.directives';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    CpfMaskDirective,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  cpf = '';
  senha = '';
  loading = signal(false);
  errorMsg = signal<string | null>(null);

  hasBiometric = signal(false);
  biometricAvailable = signal(false);

  constructor() {
    addIcons({ fingerPrint });
  }

  async ngOnInit(): Promise<void> {
    this.hasBiometric.set(this.auth.hasBiometricLocally());
    this.biometricAvailable.set(await this.auth.isBiometricAvailable());
  }

  async submit(): Promise<void> {
    this.errorMsg.set(null);
    if (!this.cpf || !this.senha) {
      this.errorMsg.set('Informe CPF e senha.');
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.login(this.cpf, this.senha);
      void this.router.navigate(['/home']);
    } catch (err: unknown) {
      this.errorMsg.set(this.extractMessage(err, 'CPF ou senha inválidos.'));
    } finally {
      this.loading.set(false);
    }
  }

  async loginBiometric(): Promise<void> {
    this.errorMsg.set(null);
    this.loading.set(true);
    try {
      await this.auth.loginWithBiometric();
      void this.router.navigate(['/home']);
    } catch (err: unknown) {
      this.errorMsg.set(this.extractMessage(err, 'Falha na biometria.'));
    } finally {
      this.loading.set(false);
    }
  }

  private extractMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const inner = (err as { error?: { message?: string } }).error;
      if (inner?.message) return inner.message;
    }
    if (err instanceof Error) return err.message;
    return fallback;
  }
}
