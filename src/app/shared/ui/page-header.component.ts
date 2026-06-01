import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline } from 'ionicons/icons';

/**
 * Header padrão do design system "Clean Saúde".
 *
 * Substitui `<ion-toolbar color="primary">` em todas as páginas autenticadas.
 * Fundo branco, título 28px peso 700, sem cor primary saturada.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, RouterLink, IonIcon],
  template: `
    <header class="page-header">
      @if (back()) {
        <a class="back-link" [routerLink]="back()">
          <ion-icon name="chevron-back-outline" aria-hidden="true"></ion-icon>
          <span>Voltar</span>
        </a>
      }

      <div class="row">
        <div class="titles">
          <h1 class="t-h1">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="t-meta">{{ subtitle() }}</p>
          }
        </div>

        @if (trailingIcon()) {
          <button class="trailing" type="button" (click)="trailingClick.emit()" [attr.aria-label]="trailingLabel() || 'Ação'">
            <ion-icon [name]="trailingIcon()" aria-hidden="true"></ion-icon>
          </button>
        }
      </div>
    </header>
  `,
  styles: [`
    .page-header {
      padding: 24px 16px 16px;
      background: #FFFFFF;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--ink-700);
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      margin-bottom: 12px;

      ion-icon { font-size: 20px; }
    }
    .row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .titles { flex: 1; min-width: 0; }
    .titles .t-meta { margin-top: 4px; }
    .trailing {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: 1px solid var(--ink-200);
      background: #FFFFFF;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--ink-700);
      cursor: pointer;
      padding: 0;

      ion-icon { font-size: 20px; }

      &:active { background: var(--ink-100); }
    }
  `],
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | undefined>();
  readonly back = input<string | undefined>();
  readonly trailingIcon = input<string | undefined>();
  readonly trailingLabel = input<string | undefined>();
  readonly trailingClick = output<void>();

  constructor() {
    addIcons({ chevronBackOutline });
  }
}
