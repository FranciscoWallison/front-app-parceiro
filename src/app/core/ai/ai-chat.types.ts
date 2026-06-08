/**
 * DTOs do canal de chat com a IA — espelham `backend/src/ai/dto/chat-input.dto.ts`.
 *
 * Handoffs: descritores serializáveis emitidos pelo backend que o
 * `ChatHandoffResolver` (no frontend) executa como ação de UI (navegar,
 * abrir câmera, mostrar toast, etc).
 *
 * Por que discriminated union: o `switch (h.kind)` do resolver fica
 * type-safe — TS verifica que cada caso foi tratado.
 */

import {
  StatusProposta,
  TipoDocumento,
  TipoProposta,
} from '../propostas/propostas.types';

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

// =============================================================================
// Handoffs — descritores de ações de UI emitidos pelo backend
// =============================================================================

export type ToastTone = 'success' | 'warning' | 'danger' | 'info';

export type Handoff =
  // Navegação por rota — auto-executáveis
  | { kind: 'OPEN_PROPOSTA_DETALHE'; propostaId: string }
  | { kind: 'OPEN_WIZARD_PF' }
  | { kind: 'OPEN_WIZARD_PME' }
  | {
      kind: 'OPEN_LISTA_PROPOSTAS';
      filtroStatus?: StatusProposta;
      filtroTipo?: TipoProposta;
    }
  | { kind: 'OPEN_ADMIN' }
  | { kind: 'OPEN_PERFIL'; focar?: 'biometria' | 'push' }
  // Ações com gesto/hardware — exigem confirmação
  | { kind: 'OPEN_CAMERA'; propostaId: string; tipoDocumento: TipoDocumento }
  | { kind: 'OPEN_SIGNATURE_MODAL'; propostaId: string }
  // Feedback ao usuário — auto-executável
  | { kind: 'SHOW_TOAST'; mensagem: string; tone?: ToastTone }
  // Destrutiva — exige confirmação
  | { kind: 'DO_LOGOUT' };

export type HandoffKind = Handoff['kind'];

/** Handoffs que exigem confirmação `AlertController` antes de executar. */
export const HANDOFFS_QUE_PEDEM_CONFIRMACAO: ReadonlySet<HandoffKind> = new Set<HandoffKind>([
  'OPEN_CAMERA',
  'OPEN_SIGNATURE_MODAL',
  'DO_LOGOUT',
]);

export function pedeConfirmacao(h: Handoff): boolean {
  return HANDOFFS_QUE_PEDEM_CONFIRMACAO.has(h.kind);
}

// =============================================================================
// ChatMessage — o que a UI renderiza
// =============================================================================

export type ChatMessageRole = 'user' | 'model' | 'tool' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  texto?: string;
  toolName?: string;
  toolStatus?: 'ok' | 'erro';
  /** Curado para exibição no chip (ex: "criarPropostaPF • #1042 SIMULADA"). */
  toolResumo?: string;
  /** Descritor de ação para o ChatHandoffResolver executar. */
  handoff?: Handoff;
  /** Estado de execução do handoff (preenchido pelo chat ao executar). */
  handoffStatus?: 'pendente' | 'executado' | 'cancelado' | 'erro';
  criadaEm: string;
}
