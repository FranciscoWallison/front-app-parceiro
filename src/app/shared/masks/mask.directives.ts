import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import {
  digits,
  maskCep,
  maskCnpj,
  maskCpf,
  maskTelefone,
} from './format.utils';

@Directive()
abstract class BaseMaskDirective {
  protected readonly el = inject(ElementRef<HTMLInputElement>);
  protected readonly ctrl = inject(NgControl, { optional: true });

  protected abstract mask(raw: string): string;
  protected abstract maxDigits: number;

  /**
   * Em Ionic, `ion-input` dispara `ionInput` em vez de `input` nativo.
   * Capturar ambos garante compatibilidade.
   */
  @HostListener('ionInput', ['$event'])
  @HostListener('input', ['$event'])
  onInput(ev: Event): void {
    const target = (ev.target as HTMLInputElement) ?? this.el.nativeElement;
    const onlyDigits = digits(target.value ?? '').slice(0, this.maxDigits);
    const formatted = this.mask(onlyDigits);
    if (target.value !== formatted) {
      target.value = formatted;
      if (this.ctrl?.control) {
        this.ctrl.control.setValue(formatted, { emitEvent: false });
      }
    }
  }
}

@Directive({ selector: '[appCpfMask]', standalone: true })
export class CpfMaskDirective extends BaseMaskDirective {
  protected maxDigits = 11;
  protected mask = maskCpf;
}

@Directive({ selector: '[appCnpjMask]', standalone: true })
export class CnpjMaskDirective extends BaseMaskDirective {
  protected maxDigits = 14;
  protected mask = maskCnpj;
}

@Directive({ selector: '[appCepMask]', standalone: true })
export class CepMaskDirective extends BaseMaskDirective {
  protected maxDigits = 8;
  protected mask = maskCep;
}

@Directive({ selector: '[appTelefoneMask]', standalone: true })
export class TelefoneMaskDirective extends BaseMaskDirective {
  protected maxDigits = 11;
  protected mask = maskTelefone;
}
