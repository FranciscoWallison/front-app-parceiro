import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline } from 'ionicons/icons';

/**
 * Indicador de progresso dos wizards PF/PME — substitui `<ion-progress-bar>` +
 * "Passo X de N".
 *
 * 5 dots conectados por linha 1px ink-200:
 *   - completados: dot accent com checkmark branco
 *   - atual: dot accent 8px + label peso 600 ink-900 abaixo
 *   - pendentes: dot ink-300 + label peso 500 ink-500 abaixo
 */
@Component({
  selector: 'app-wizard-stepper',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <ol class="stepper">
      @for (label of steps(); track label; let i = $index; let last = $last) {
        <li class="step" [class.is-done]="i < current()" [class.is-current]="i === current()">
          <div class="row">
            <span class="dot">
              @if (i < current()) {
                <ion-icon name="checkmark-outline" aria-hidden="true"></ion-icon>
              }
            </span>
            @if (!last) {
              <span class="line" [class.line-done]="i < current()"></span>
            }
          </div>
          <span class="label">{{ label }}</span>
        </li>
      }
    </ol>
  `,
  styles: [`
    .stepper {
      list-style: none;
      margin: 0;
      padding: 0 16px;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      gap: 0;
    }
    .step {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      min-width: 0;
    }
    .row {
      display: flex;
      align-items: center;
      width: 100%;
    }
    .dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2px solid var(--ink-300);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s, border-color 0.15s;

      ion-icon {
        color: #FFFFFF;
        font-size: 12px;
      }
    }
    .line {
      flex: 1;
      height: 1px;
      background: var(--ink-200);
      margin: 0 4px;
    }
    .line-done { background: var(--ion-color-primary); }
    .label {
      margin-top: 8px;
      font-size: 11px;
      font-weight: 500;
      color: var(--ink-500);
      text-align: left;
      letter-spacing: 0.02em;
      padding-right: 8px;
    }
    .is-current .dot {
      background: var(--ion-color-primary);
      border-color: var(--ion-color-primary);
      box-shadow: 0 0 0 4px rgba(10, 102, 255, 0.12);
    }
    .is-current .label {
      color: var(--ink-900);
      font-weight: 600;
    }
    .is-done .dot {
      background: var(--ion-color-primary);
      border-color: var(--ion-color-primary);
    }
    .is-done .label {
      color: var(--ink-700);
    }
  `],
})
export class WizardStepperComponent {
  readonly steps = input.required<string[]>();
  readonly current = input.required<number>();

  constructor() {
    addIcons({ checkmarkOutline });
  }
}
