import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../http/api.config';
import {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ToolHop,
} from './ai-chat.types';

const SESSION_KEY = 'corretor.ai.sessionId';

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private readonly http = inject(HttpClient);

  /** sessionId é restaurado do localStorage para continuar conversa entre reinícios. */
  readonly sessionId = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null,
  );

  /**
   * Envia mensagem ao backend, recebe texto final + hops. O service ATUALIZA
   * o `sessionId` automaticamente após a primeira resposta.
   */
  async enviar(mensagem: string): Promise<ChatResponse> {
    const req: ChatRequest = { mensagem };
    const sid = this.sessionId();
    if (sid) req.sessionId = sid;

    const resp = await firstValueFrom(
      this.http.post<ChatResponse>(apiUrl('/ai/chat'), req),
    );

    if (resp.sessionId !== sid) {
      this.sessionId.set(resp.sessionId);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SESSION_KEY, resp.sessionId);
      }
    }
    return resp;
  }

  resetSession(): void {
    this.sessionId.set(null);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY);
  }

  /**
   * Converte um ToolHop do backend em uma mensagem renderizável de "ferramenta"
   * exibida como chip cinza entre mensagens user/model.
   */
  hopParaMensagem(hop: ToolHop, criadaEm: string): ChatMessage {
    const resultado = hop.result as { erro?: string; handoff?: string; propostaId?: string; numero?: number; status?: string };
    const erro = typeof resultado === 'object' && resultado?.erro ? resultado.erro : undefined;

    let resumo = hop.name;
    if (resultado && typeof resultado === 'object') {
      const r = resultado as Record<string, unknown>;
      if (r['numero']) resumo += ` · #${r['numero']}`;
      if (r['status']) resumo += ` ${r['status']}`;
      else if (Array.isArray(r)) resumo += ` (${(r as unknown[]).length} itens)`;
    }

    let handoff: ChatMessage['handoff'];
    if (resultado?.handoff === 'OPEN_PROPOSTA_DETALHE' || resultado?.handoff === 'OPEN_SIGNATURE_MODAL') {
      handoff = { kind: resultado.handoff, propostaId: resultado.propostaId ?? '' };
    }

    return {
      id: cryptoRandomId(),
      role: 'tool',
      toolName: hop.name,
      toolStatus: erro ? 'erro' : 'ok',
      toolResumo: erro ? `${hop.name} · ${erro}` : resumo,
      handoff,
      criadaEm,
    };
  }
}

function cryptoRandomId(): string {
  // crypto.randomUUID() está disponível em browsers modernos
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
