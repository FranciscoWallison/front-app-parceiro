import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../http/api.config';
import {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  Handoff,
  ToolHop,
  pedeConfirmacao,
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
   * Converte um ToolHop do backend em uma mensagem renderizável de "ferramenta".
   *
   * O backend pode incluir `handoff` em DUAS formas no result:
   * - Antiga (compat): `{ handoff: 'OPEN_PROPOSTA_DETALHE', propostaId }` (string)
   * - Nova: `{ handoff: { kind, ...payload } }` (objeto discriminated union)
   *
   * Sempre normalizamos para o formato `Handoff`.
   */
  hopParaMensagem(hop: ToolHop, criadaEm: string): ChatMessage {
    const resultado = hop.result as Record<string, unknown> | undefined;
    const erro =
      resultado && typeof resultado === 'object' && typeof resultado['erro'] === 'string'
        ? (resultado['erro'] as string)
        : undefined;

    const resumo = this.montarResumo(hop.name, resultado);
    const handoff = erro ? undefined : this.extrairHandoff(resultado);

    return {
      id: cryptoRandomId(),
      role: 'tool',
      toolName: hop.name,
      toolStatus: erro ? 'erro' : 'ok',
      toolResumo: erro ? `${hop.name} · ${erro}` : resumo,
      handoff,
      handoffStatus: handoff ? 'pendente' : undefined,
      criadaEm,
    };
  }

  private montarResumo(nome: string, r: Record<string, unknown> | undefined): string {
    let resumo = nome;
    if (!r || typeof r !== 'object') return resumo;
    if (typeof r['numero'] === 'number') resumo += ` · #${r['numero']}`;
    if (typeof r['status'] === 'string') resumo += ` ${r['status']}`;
    else if (Array.isArray(r)) resumo += ` (${(r as unknown[]).length} itens)`;
    return resumo;
  }

  private extrairHandoff(r: Record<string, unknown> | undefined): Handoff | undefined {
    if (!r || typeof r !== 'object') return undefined;
    const raw = r['handoff'];

    // Novo formato: objeto com kind discriminante
    if (raw && typeof raw === 'object' && typeof (raw as { kind?: unknown }).kind === 'string') {
      return raw as Handoff;
    }

    // Compat com formato antigo (string + propostaId no root)
    if (typeof raw === 'string') {
      const propostaId = typeof r['propostaId'] === 'string' ? (r['propostaId'] as string) : '';
      if (raw === 'OPEN_PROPOSTA_DETALHE' && propostaId) {
        return { kind: 'OPEN_PROPOSTA_DETALHE', propostaId };
      }
      if (raw === 'OPEN_SIGNATURE_MODAL' && propostaId) {
        return { kind: 'OPEN_SIGNATURE_MODAL', propostaId };
      }
    }
    return undefined;
  }

  /** True se o handoff precisa de Alert antes de executar. */
  precisaConfirmacao(h: Handoff): boolean {
    return pedeConfirmacao(h);
  }
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
