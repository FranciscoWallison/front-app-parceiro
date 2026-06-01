import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonFooter,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  arrowForwardOutline,
  arrowUpOutline,
  closeCircleOutline,
  cogOutline,
  refreshOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { AiChatService } from '../../core/ai/ai-chat.service';
import { ChatMessage } from '../../core/ai/ai-chat.types';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonFooter,
    IonIcon,
    IonSpinner,
    PageHeaderComponent,
  ],
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements AfterViewChecked {
  private readonly ai = inject(AiChatService);

  @ViewChild('scrollArea', { static: false }) scrollArea?: ElementRef<HTMLElement>;

  rascunho = '';
  mensagens = signal<ChatMessage[]>([]);
  loading = signal(false);

  podeEnviar = () => !this.loading() && this.rascunho.trim().length > 0;

  constructor() {
    addIcons({
      sparklesOutline,
      arrowUpOutline,
      arrowForwardOutline,
      cogOutline,
      closeCircleOutline,
      alertCircleOutline,
      refreshOutline,
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  onEnter(ev: Event): void {
    const e = ev as KeyboardEvent;
    if (e.shiftKey) return; // permite quebra de linha
    e.preventDefault();
    void this.enviar();
  }

  ajustarAltura(ta: HTMLTextAreaElement): void {
    ta.style.height = 'auto';
    ta.style.height = Math.min(140, ta.scrollHeight) + 'px';
  }

  enviarSugestao(texto: string): void {
    this.rascunho = texto;
    void this.enviar();
  }

  async enviar(): Promise<void> {
    if (!this.podeEnviar()) return;
    const texto = this.rascunho.trim();
    this.rascunho = '';

    const agora = new Date().toISOString();
    this.mensagens.update((arr) => [
      ...arr,
      { id: cryptoRandomId(), role: 'user', texto, criadaEm: agora },
    ]);

    this.loading.set(true);
    try {
      const resp = await this.ai.enviar(texto);
      const ts = new Date().toISOString();
      const hops = resp.hops.map((h) => this.ai.hopParaMensagem(h, ts));
      const modelMsg: ChatMessage = {
        id: cryptoRandomId(),
        role: 'model',
        texto: resp.texto || '(sem resposta)',
        criadaEm: ts,
      };
      this.mensagens.update((arr) => [...arr, ...hops, modelMsg]);
    } catch (err: unknown) {
      const msg = this.mensagemErroAmigavel(err);
      this.mensagens.update((arr) => [
        ...arr,
        {
          id: cryptoRandomId(),
          role: 'error',
          texto: msg,
          criadaEm: new Date().toISOString(),
        },
      ]);
    } finally {
      this.loading.set(false);
    }
  }

  resetar(): void {
    this.mensagens.set([]);
    this.ai.resetSession();
  }

  private mensagemErroAmigavel(err: unknown): string {
    const e = err as { status?: number; error?: { message?: string }; message?: string };
    const status = e?.status;
    if (status === 429) return 'Você atingiu o limite de mensagens. Aguarde alguns segundos.';
    if (status === 503) return 'O serviço de IA está sobrecarregado. Tente novamente em instantes.';
    if (status === 401 || status === 403) return 'Sessão expirada. Faça login novamente.';
    if (status === 500) return 'Erro no servidor. Verifique se a chave GEMINI_API_KEY está configurada no backend.';
    return e?.error?.message ?? e?.message ?? 'Falha ao falar com o assistente.';
  }

  private scrollToBottom(): void {
    const el = this.scrollArea?.nativeElement;
    if (!el) return;
    const content = el.closest('ion-content');
    if (content && 'scrollToBottom' in content) {
      void (content as unknown as { scrollToBottom: (d: number) => Promise<void> }).scrollToBottom(150);
    }
  }
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
