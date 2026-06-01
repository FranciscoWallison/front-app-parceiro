import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { StatusProposta } from '../../core/propostas/propostas.types';

type PillTone = 'warning' | 'success' | 'danger' | 'info' | 'neutral';

const STATUS_TONE: Record<StatusProposta, PillTone> = {
  RASCUNHO: 'neutral',
  SIMULADA: 'info',
  AGUARDANDO_DOCS: 'warning',
  AGUARDANDO_ASSINATURA: 'warning',
  AGUARDANDO_PAGAMENTO: 'warning',
  TRANSMITIDA: 'info',
  APROVADA: 'success',
  RECUSADA: 'danger',
  CANCELADA: 'neutral',
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

const STATUS_LABEL_SHORT: Record<StatusProposta, string> = {
  RASCUNHO: 'Rascunho',
  SIMULADA: 'Simulada',
  AGUARDANDO_DOCS: 'Documentos',
  AGUARDANDO_ASSINATURA: 'Assinatura',
  AGUARDANDO_PAGAMENTO: 'Pagamento',
  TRANSMITIDA: 'Transmitida',
  APROVADA: 'Aprovada',
  RECUSADA: 'Recusada',
  CANCELADA: 'Cancelada',
};

/**
 * Pill de status para propostas — substitui `<ion-chip color="warning">`.
 *
 * Tint suave de background + foreground escuro (Notion/Linear-style), com
 * bullet 6px de currentColor à esquerda. Mapeia StatusProposta → tone.
 */
@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-pill" [class]="'status-pill--' + tone()">
      {{ label() }}
    </span>
  `,
})
export class StatusPillComponent {
  readonly status = input.required<StatusProposta>();
  readonly short = input<boolean>(false);

  readonly tone = computed<PillTone>(() => STATUS_TONE[this.status()] ?? 'neutral');
  readonly label = computed<string>(() => {
    const dict = this.short() ? STATUS_LABEL_SHORT : STATUS_LABEL;
    return dict[this.status()] ?? this.status();
  });
}
