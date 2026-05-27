import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, hourglass, refresh } from 'ionicons/icons';
import { PropostasService } from '../../core/propostas/propostas.service';
import { PropostaResumo } from '../../core/propostas/propostas.types';

@Component({
  selector: 'app-propostas-admin',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonChip,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonSpinner,
    IonText,
  ],
  templateUrl: './propostas-admin.page.html',
  styleUrls: ['./propostas-admin.page.scss'],
})
export class PropostasAdminPage implements OnInit {
  private readonly service = inject(PropostasService);
  private readonly alertCtrl = inject(AlertController);
  private readonly router = inject(Router);

  loading = signal(true);
  busy = signal(false);
  error = signal<string | null>(null);
  notice = signal<string | null>(null);
  propostas = signal<PropostaResumo[]>([]);

  constructor() {
    addIcons({ checkmarkCircle, closeCircle, hourglass, refresh });
  }

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const lista = await this.service.listar({ status: 'TRANSMITIDA' });
      this.propostas.set(lista);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Falha ao carregar.');
    } finally {
      this.loading.set(false);
    }
  }

  async aprovar(p: PropostaResumo): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: 'Aprovar proposta?',
      message: `#${p.numero} — ${p.titularOuEmpresa}`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aprovar',
          role: 'confirm',
          handler: async () => {
            await this.executar(() => this.service.aprovar(p.id), 'Aprovada com sucesso.');
          },
        },
      ],
    });
    await confirm.present();
  }

  async recusar(p: PropostaResumo): Promise<void> {
    const prompt = await this.alertCtrl.create({
      header: 'Recusar proposta',
      message: `#${p.numero} — ${p.titularOuEmpresa}`,
      inputs: [
        {
          name: 'motivo',
          type: 'textarea',
          placeholder: 'Motivo da recusa (opcional)',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Recusar',
          role: 'destructive',
          handler: async (data) => {
            const motivo: string = data?.motivo?.trim() ?? '';
            await this.executar(
              () => this.service.recusar(p.id, motivo || undefined),
              'Recusada com sucesso.',
            );
          },
        },
      ],
    });
    await prompt.present();
  }

  abrir(p: PropostaResumo): void {
    void this.router.navigate(['/propostas', p.id]);
  }

  private async executar(
    fn: () => Promise<unknown>,
    msgSucesso: string,
  ): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      await fn();
      this.notice.set(msgSucesso);
      await this.recarregar();
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Falha.');
    } finally {
      this.busy.set(false);
    }
  }
}
