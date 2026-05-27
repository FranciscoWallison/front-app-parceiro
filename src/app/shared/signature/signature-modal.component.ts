import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonText,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmark, close, refresh } from 'ionicons/icons';
import SignaturePad from 'signature_pad';

@Component({
  selector: 'app-signature-modal',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonText,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="cancelar()"><ion-icon name="close" slot="icon-only"></ion-icon></ion-button>
        </ion-buttons>
        <ion-title>Assine no quadro abaixo</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [scrollY]="false">
      <div class="canvas-wrap" #wrap>
        <canvas #pad></canvas>
      </div>
      <ion-text color="medium">
        <p class="hint">Use o dedo para desenhar sua assinatura.</p>
      </ion-text>
      @if (error()) {
        <ion-text color="danger"><p class="hint">{{ error() }}</p></ion-text>
      }
      <div class="actions">
        <ion-button fill="outline" color="medium" (click)="limpar()">
          <ion-icon name="refresh" slot="start"></ion-icon>
          Limpar
        </ion-button>
        <ion-button color="success" (click)="confirmar()">
          <ion-icon name="checkmark" slot="start"></ion-icon>
          Confirmar assinatura
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [
    `
      ion-content {
        --background: var(--ion-color-light, #f4f4f4);
      }
      .canvas-wrap {
        margin: 16px;
        border: 2px dashed var(--ion-color-medium);
        border-radius: 8px;
        background: white;
        height: 55vh;
        position: relative;
        overflow: hidden;
      }
      canvas {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: none;
        cursor: crosshair;
      }
      .hint {
        text-align: center;
        font-size: 0.85em;
        margin: 4px 0 12px;
      }
      .actions {
        display: flex;
        gap: 12px;
        padding: 0 16px 24px;
      }
      .actions ion-button {
        flex: 1;
      }
    `,
  ],
})
export class SignatureModalComponent implements AfterViewInit, OnDestroy {
  @ViewChild('pad') padRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wrap') wrapRef!: ElementRef<HTMLDivElement>;
  private pad?: SignaturePad;
  private readonly modalCtrl = inject(ModalController);
  readonly error = signal<string | null>(null);

  private readonly MIN_BASE64_SIZE = 200;

  constructor() {
    addIcons({ close, refresh, checkmark });
  }

  ngAfterViewInit(): void {
    // Modal do Ionic anima → canvas precisa esperar a apresentação terminar
    // antes de medir width/height (senão fica 0x0 e SignaturePad não desenha).
    // Tentamos algumas vezes até o canvas ter dimensão real.
    this.aguardarECriar();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    this.pad?.off();
  }

  private aguardarECriar(tentativa = 0): void {
    const canvas = this.padRef?.nativeElement;
    const wrap = this.wrapRef?.nativeElement;
    const w = wrap?.clientWidth ?? 0;
    const h = wrap?.clientHeight ?? 0;
    if (!canvas || w === 0 || h === 0) {
      if (tentativa < 20) {
        setTimeout(() => this.aguardarECriar(tentativa + 1), 50);
      } else {
        this.error.set('Não foi possível inicializar o canvas. Feche e abra a tela de novo.');
      }
      return;
    }
    this.aplicarTamanho(canvas, w, h);
    this.pad = new SignaturePad(canvas, {
      backgroundColor: 'rgba(255,255,255,1)',
      penColor: '#1a1a1a',
      minWidth: 1.2,
      maxWidth: 3.0,
      throttle: 16,
    });
  }

  private aplicarTamanho(canvas: HTMLCanvasElement, w: number, h: number): void {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }
  }

  private onResize = (): void => {
    if (!this.padRef || !this.wrapRef || !this.pad) return;
    const data = this.pad.toData();
    const canvas = this.padRef.nativeElement;
    const wrap = this.wrapRef.nativeElement;
    this.aplicarTamanho(canvas, wrap.clientWidth, wrap.clientHeight);
    this.pad.fromData(data);
  };

  limpar(): void {
    this.error.set(null);
    this.pad?.clear();
  }

  cancelar(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  confirmar(): void {
    this.error.set(null);
    if (!this.pad) {
      this.error.set('Canvas não inicializado.');
      return;
    }
    if (this.pad.isEmpty()) {
      this.error.set('Desenhe sua assinatura antes de confirmar.');
      return;
    }
    const dataUrl = this.pad.toDataURL('image/png');
    if (!dataUrl || dataUrl.length < this.MIN_BASE64_SIZE) {
      this.error.set('Assinatura muito curta. Desenhe um traço maior.');
      return;
    }
    void this.modalCtrl.dismiss(dataUrl, 'confirm');
  }
}
