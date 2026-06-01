import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  chatbubblesOutline,
  chevronForwardOutline,
  documentsOutline,
  helpCircleOutline,
  hourglassOutline,
  imagesOutline,
  logOutOutline,
  personAddOutline,
  personCircleOutline,
} from 'ionicons/icons';
import { AuthService } from '../core/auth/auth.service';
import { DashboardService } from '../core/dashboard/dashboard.service';
import { DashboardData } from '../core/propostas/propostas.types';
import { KpiGroupComponent, KpiItem } from '../shared/ui/kpi-group.component';
import { PageHeaderComponent } from '../shared/ui/page-header.component';
import { StatusPillComponent } from '../shared/ui/status-pill.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    IonContent,
    IonIcon,
    IonButton,
    IonSpinner,
    PageHeaderComponent,
    KpiGroupComponent,
    StatusPillComponent,
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

  kpiItems = computed<KpiItem[]>(() => {
    const c = this.contadores();
    return [
      { label: 'Em aberto', value: c.abertas, tone: c.abertas > 0 ? 'warning' : 'neutral' },
      { label: 'Transmitidas', value: c.transmitidas, tone: c.transmitidas > 0 ? 'info' : 'neutral' },
      { label: 'Concluídas', value: c.fechadas, tone: 'success' },
    ];
  });

  constructor() {
    addIcons({
      logOutOutline,
      personAddOutline,
      businessOutline,
      documentsOutline,
      imagesOutline,
      personCircleOutline,
      helpCircleOutline,
      chatbubblesOutline,
      hourglassOutline,
      chevronForwardOutline,
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
