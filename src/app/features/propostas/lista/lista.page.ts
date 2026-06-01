import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, documentTextOutline } from 'ionicons/icons';
import { PropostasService } from '../../../core/propostas/propostas.service';
import {
  PropostaResumo,
  TipoProposta,
} from '../../../core/propostas/propostas.types';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusPillComponent } from '../../../shared/ui/status-pill.component';

@Component({
  selector: 'app-propostas-lista',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    IonContent,
    IonButton,
    IonIcon,
    IonLabel,
    IonFab,
    IonFabButton,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    PageHeaderComponent,
    StatusPillComponent,
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

  constructor() {
    addIcons({ add, documentTextOutline });
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
