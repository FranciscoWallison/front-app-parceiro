import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonRow,
  IonCol,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  briefcase,
  business,
  cashOutline,
  chatbubbles,
  checkmarkCircle,
  documents,
  helpCircle,
  hourglass,
  imagesOutline,
  list,
  logOut,
  personCircle,
} from 'ionicons/icons';
import { AuthService } from '../core/auth/auth.service';
import { DashboardService } from '../core/dashboard/dashboard.service';
import {
  DashboardData,
  StatusProposta,
} from '../core/propostas/propostas.types';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonList,
    IonItem,
    IonLabel,
    IonChip,
    IonIcon,
    IonButton,
    IonSpinner,
    IonText,
  ],
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);
  private readonly router = inject(Router);

  user = this.auth.user;
  hasBiometric = this.auth.hasBiometricLocally;
  biometricAvailable = signal(false);
  busy = signal(false);
  notice = signal<string | null>(null);

  loading = signal(true);
  errorMsg = signal<string | null>(null);
  data = signal<DashboardData | null>(null);

  // contadores agrupados para os cards
  contadores = computed(() => {
    const d = this.data();
    if (!d) return { abertas: 0, transmitidas: 0, fechadas: 0 };
    const c = d.contadores;
    const abertas =
      (c.RASCUNHO ?? 0) +
      (c.SIMULADA ?? 0) +
      (c.AGUARDANDO_DOCS ?? 0) +
      (c.AGUARDANDO_ASSINATURA ?? 0) +
      (c.AGUARDANDO_PAGAMENTO ?? 0);
    const transmitidas = c.TRANSMITIDA ?? 0;
    const fechadas = (c.APROVADA ?? 0) + (c.RECUSADA ?? 0);
    return { abertas, transmitidas, fechadas };
  });

  STATUS_LABEL_SHORT: Record<StatusProposta, string> = {
    RASCUNHO: 'Rascunho',
    SIMULADA: 'Simulada',
    AGUARDANDO_DOCS: 'Docs',
    AGUARDANDO_ASSINATURA: 'Assinar',
    AGUARDANDO_PAGAMENTO: 'Pagamento',
    TRANSMITIDA: 'Transmitida',
    APROVADA: 'Aprovada',
    RECUSADA: 'Recusada',
    CANCELADA: 'Cancelada',
  };

  STATUS_COLOR: Record<StatusProposta, string> = {
    RASCUNHO: 'medium',
    SIMULADA: 'tertiary',
    AGUARDANDO_DOCS: 'warning',
    AGUARDANDO_ASSINATURA: 'warning',
    AGUARDANDO_PAGAMENTO: 'warning',
    TRANSMITIDA: 'primary',
    APROVADA: 'success',
    RECUSADA: 'danger',
    CANCELADA: 'medium',
  };

  constructor() {
    addIcons({
      personCircle,
      business,
      checkmarkCircle,
      logOut,
      add,
      list,
      briefcase,
      cashOutline,
      documents,
      imagesOutline,
      chatbubbles,
      helpCircle,
      hourglass,
    });
  }

  async ngOnInit(): Promise<void> {
    this.biometricAvailable.set(await this.auth.isBiometricAvailable());
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      this.data.set(await this.dashboard.get());
    } catch (err: unknown) {
      this.errorMsg.set(
        err instanceof Error ? err.message : 'Falha ao carregar dashboard.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    void this.router.navigate(['/login']);
  }

  async enableBiometric(): Promise<void> {
    this.busy.set(true);
    this.notice.set(null);
    try {
      await this.auth.enrollBiometric();
      this.notice.set('Biometria habilitada.');
    } catch (err: unknown) {
      this.notice.set(err instanceof Error ? err.message : 'Falha.');
    } finally {
      this.busy.set(false);
    }
  }
}
