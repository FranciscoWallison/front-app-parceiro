import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
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
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send } from 'ionicons/icons';
import { ContatoService } from '../../core/contato/contato.service';

@Component({
  selector: 'app-contato',
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
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonIcon,
    IonSpinner,
    IonText,
  ],
  templateUrl: './contato.page.html',
  styleUrls: ['./contato.page.scss'],
})
export class ContatoPage {
  private readonly service = inject(ContatoService);

  assunto = '';
  mensagem = '';
  busy = signal(false);
  notice = signal<string | null>(null);
  error = signal<string | null>(null);

  constructor() {
    addIcons({ send });
  }

  async enviar(): Promise<void> {
    if (!this.assunto || !this.mensagem) {
      this.error.set('Preencha assunto e mensagem.');
      return;
    }
    this.busy.set(true);
    this.notice.set(null);
    this.error.set(null);
    try {
      const res = await this.service.enviar(this.assunto, this.mensagem);
      this.notice.set(`Mensagem enviada (id ${res.id.slice(0, 8)}...). Em breve entraremos em contato.`);
      this.assunto = '';
      this.mensagem = '';
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Falha ao enviar.');
    } finally {
      this.busy.set(false);
    }
  }
}
