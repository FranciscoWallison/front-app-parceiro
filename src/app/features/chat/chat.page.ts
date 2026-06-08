import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  cameraOutline,
  checkmarkOutline,
  closeCircleOutline,
  cogOutline,
  logOutOutline,
  micOutline,
  pencilOutline,
  refreshOutline,
  sparklesOutline,
  stopOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { AiChatService } from '../../core/ai/ai-chat.service';
import { ChatHandoffResolver } from '../../core/ai/chat-handoff.resolver';
import { ChatMessage, Handoff } from '../../core/ai/ai-chat.types';
import { SpeechService } from '../../core/ai/speech.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonFooter,
    IonIcon,
    IonSpinner,
    PageHeaderComponent,
  ],
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit, OnDestroy {
  private readonly ai = inject(AiChatService);
  private readonly resolver = inject(ChatHandoffResolver);
  readonly speech = inject(SpeechService);

  @ViewChild('scrollArea', { static: false }) scrollArea?: ElementRef<HTMLElement>;

  rascunho = '';
  mensagens = signal<ChatMessage[]>([]);
  loading = signal(false);
  voiceError = signal<string | null>(null);

  private speechSubs: Subscription[] = [];

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
      cameraOutline,
      pencilOutline,
      logOutOutline,
      checkmarkOutline,
      micOutline,
      stopOutline,
    });
    // Scroll para o final só quando a lista de mensagens muda, em vez de a
    // cada ngAfterViewChecked (que entrava em loop com mudanças do ion-content).
    effect(() => {
      // Lê o signal para registrar dependência
      this.mensagens();
      this.loading();
      setTimeout(() => this.scrollToBottom(), 50);
    });
  }

  ngOnInit(): void {
    // STT: quando o Azure emite texto final, manda direto pro pipeline.
    this.speechSubs.push(
      this.speech.transcription$.subscribe((texto) => {
        const limpo = texto.trim();
        if (!limpo) return;
        this.rascunho = limpo;
        this.speech.stopListening();
        void this.enviar();
      }),
    );
    this.speechSubs.push(
      this.speech.error$.subscribe((msg) => {
        this.voiceError.set(msg);
        // Auto-dismiss em 4s
        setTimeout(() => this.voiceError.set(null), 4000);
      }),
    );
  }

  ngOnDestroy(): void {
    this.speech.stopListening();
    this.speechSubs.forEach((s) => s.unsubscribe());
    this.speechSubs = [];
  }

  async toggleMic(): Promise<void> {
    this.voiceError.set(null);
    if (this.speech.isListening()) {
      this.speech.stopListening();
      return;
    }
    await this.speech.startListening('pt-BR');
  }

  onEnter(ev: Event): void {
    const e = ev as KeyboardEvent;
    if (e.shiftKey) return;
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

      // Auto-executa handoffs que não precisam de confirmação.
      // Para destrutivos, o usuário clica no botão "Executar agora" no chip.
      for (const m of hops) {
        if (m.handoff && !this.ai.precisaConfirmacao(m.handoff)) {
          void this.executarHandoff(m);
        }
      }
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

  /**
   * Disparado pelo botão "Executar agora" no chip de tool (para handoffs com
   * confirmação) ou automaticamente pelo `enviar()` (para auto-executáveis).
   */
  async executarHandoff(m: ChatMessage): Promise<void> {
    if (!m.handoff) return;
    this.atualizarHandoffStatus(m.id, 'pendente');
    try {
      const ok = await this.resolver.executar(m.handoff);
      this.atualizarHandoffStatus(m.id, ok ? 'executado' : 'cancelado');
    } catch {
      this.atualizarHandoffStatus(m.id, 'erro');
    }
  }

  private atualizarHandoffStatus(
    id: string,
    status: NonNullable<ChatMessage['handoffStatus']>,
  ): void {
    this.mensagens.update((arr) =>
      arr.map((m) => (m.id === id ? { ...m, handoffStatus: status } : m)),
    );
  }

  /** Botão e label do CTA do chip dependem do tipo de handoff. */
  labelHandoff(h: Handoff | undefined): string {
    if (!h) return 'Executar';
    switch (h.kind) {
      case 'OPEN_CAMERA': return 'Abrir câmera';
      case 'OPEN_SIGNATURE_MODAL': return 'Abrir assinatura';
      case 'DO_LOGOUT': return 'Sair da conta';
      default: return 'Executar';
    }
  }

  iconeHandoff(h: Handoff | undefined): string {
    if (!h) return 'arrow-forward-outline';
    switch (h.kind) {
      case 'OPEN_CAMERA': return 'camera-outline';
      case 'OPEN_SIGNATURE_MODAL': return 'pencil-outline';
      case 'DO_LOGOUT': return 'log-out-outline';
      default: return 'arrow-forward-outline';
    }
  }

  precisaConfirmar(h: Handoff | undefined): boolean {
    return !!h && this.ai.precisaConfirmacao(h);
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
