/**
 * DTOs do canal de chat com a IA — espelham `backend/src/ai/dto/chat-input.dto.ts`.
 *
 * `ChatMessage` é o tipo do que a UI renderiza (inclui chamadas de ferramenta
 * como uma "linha" entre user e model). O backend envia hops separados; o
 * frontend monta as bolhas a partir do array.
 */

export interface ChatRequest {
  mensagem: string;
  sessionId?: string;
}

export interface ToolHop {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface ChatResponse {
  sessionId: string;
  texto: string;
  hops: ToolHop[];
}

export type ChatMessageRole = 'user' | 'model' | 'tool' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  texto?: string;
  toolName?: string;
  toolStatus?: 'ok' | 'erro';
  /** Curado para exibição no chip (ex: "criarPropostaPF • #1042 SIMULADA"). */
  toolResumo?: string;
  /** Indica handoff para outra tela (ex: abrir proposta). */
  handoff?: { kind: 'OPEN_PROPOSTA_DETALHE' | 'OPEN_SIGNATURE_MODAL'; propostaId: string };
  criadaEm: string;
}
