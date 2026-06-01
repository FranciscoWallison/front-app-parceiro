import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

export interface KpiItem {
  label: string;
  value: number | string;
  /** tone tinge apenas o bullet, nunca o card inteiro */
  tone?: 'neutral' | 'warning' | 'success' | 'info';
}

/**
 * KPI group estilo Stripe Dashboard.
 *
 * 3 colunas separadas por borda vertical 1px ink-200 — SEM cards individuais
 * coloridos. Numeral 32px peso 700 tabular-nums, label 11px uppercase ink-500.
 */
@Component({
  selector: 'app-kpi-group',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kpi-group" [style.grid-template-columns]="'repeat(' + items().length + ', 1fr)'">
      @for (it of items(); track it.label; let last = $last) {
        <div class="kpi" [class.has-divider]="!last">
          <span class="t-label">{{ it.label }}</span>
          <span class="kpi-value" [class]="'tone-' + (it.tone || 'neutral')">
            @if (it.tone && it.tone !== 'neutral') {
              <span class="bullet" aria-hidden="true"></span>
            }
            <span class="t-kpi">{{ it.value }}</span>
          </span>
        </div>
      }
    </div>
  `,
  styles: [`
    .kpi-group {
      display: grid;
      gap: 0;
      padding: 16px;
      margin: 0 16px;
      border: var(--card-border);
      border-radius: var(--card-radius);
      background: #FFFFFF;
    }
    .kpi {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0 16px;
      min-width: 0;
    }
    .kpi:first-child { padding-left: 0; }
    .kpi:last-child  { padding-right: 0; }
    .has-divider { border-right: 1px solid var(--ink-200); }

    .kpi-value {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .bullet {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .tone-warning .bullet { background: #F59E0B; }
    .tone-success .bullet { background: #10B981; }
    .tone-info    .bullet { background: var(--ion-color-primary); }
  `],
})
export class KpiGroupComponent {
  readonly items = input.required<KpiItem[]>();
}
