import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, briefcase, person, time } from 'ionicons/icons';
import { PropostasService } from '../../../core/propostas/propostas.service';
import {
  PropostaResumo,
  StatusProposta,
  TipoProposta,
} from '../../../core/propostas/propostas.types';

const STATUS_COLOR: Record<StatusProposta, string> = {
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

const STATUS_LABEL: Record<StatusProposta, string> = {
  RASCUNHO: 'Rascunho',
  SIMULADA: 'Simulada',
  AGUARDANDO_DOCS: 'Aguardando documentos',
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  TRANSMITIDA: 'Transmitida',
  APROVADA: 'Aprovada',
  RECUSADA: 'Recusada',
  CANCELADA: 'Cancelada',
};

@Component({
  selector: 'app-propostas-lista',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonChip,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSpinner,
    IonText,
    IonSegment,
    IonSegmentButton,
  ],
  templateUrl: './lista.page.html',
  styleUrls: ['./lista.page.scss'],
})
export class PropostasListaPage implements OnInit {
  private readonly service = inject(PropostasService);
  private readonly router = inject(Router);

  loading = signal(true);
  error = signal<string | null>(null);
  filtroTipo = signal<TipoProposta | 'TODOS'>('TODOS');

  propostas = this.service.lista;

  readonly STATUS_COLOR = STATUS_COLOR;
  readonly STATUS_LABEL = STATUS_LABEL;

  constructor() {
    addIcons({ add, briefcase, person, time });
  }

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const tipo = this.filtroTipo();
      await this.service.listar(tipo !== 'TODOS' ? { tipo } : undefined);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Falha ao carregar.');
    } finally {
      this.loading.set(false);
    }
  }

  onFiltroChange(v: string | number | undefined): void {
    this.filtroTipo.set((v as TipoProposta | 'TODOS') ?? 'TODOS');
    void this.recarregar();
  }

  abrir(p: PropostaResumo): void {
    void this.router.navigate(['/propostas', p.id]);
  }
}
