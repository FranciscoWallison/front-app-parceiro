import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Browser } from '@capacitor/browser';
import {
  IonContent,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  barcodeOutline,
  cameraOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  closeCircleOutline,
  cloudDoneOutline,
  copyOutline,
  documentTextOutline,
  eyeOutline,
  pencilOutline,
  qrCodeOutline,
  sparklesOutline,
  trashOutline,
} from 'ionicons/icons';
import * as QRCode from 'qrcode';
import { DocumentosService } from '../../../core/documentos/documentos.service';
import { PropostasService } from '../../../core/propostas/propostas.service';
import {
  MetodoPagamento,
  PropostaDetalhe,
  TipoDocumento,
} from '../../../core/propostas/propostas.types';
import { SignatureModalComponent } from '../../../shared/signature/signature-modal.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusPillComponent } from '../../../shared/ui/status-pill.component';

@Component({
  selector: 'app-proposta-detalhe',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    IonContent,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    PageHeaderComponent,
    StatusPillComponent,
  ],
  templateUrl: './detalhe.page.html',
  styleUrls: ['./detalhe.page.scss'],
})
export class PropostaDetalhePage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(PropostasService);
  private readonly documentosService = inject(DocumentosService);
  private readonly modalCtrl = inject(ModalController);

  loading = signal(true);
  busy = signal(false);
  uploading = signal(false);
  error = signal<string | null>(null);
  notice = signal<string | null>(null);
  proposta = signal<PropostaDetalhe | null>(null);
  qrDataUrl = signal<string | null>(null);
  tipoDocSelecionado = signal<TipoDocumento>('RG');

  private pollHandle: ReturnType<typeof setInterval> | null = null;

  readonly TIPOS_DOC: TipoDocumento[] = [
    'RG',
    'CNH',
    'COMPROVANTE_RESIDENCIA',
    'CONTRATO_SOCIAL',
    'CARTAO_CNPJ',
    'OUTRO',
  ];

  titularesPayload = computed(() => {
    const p = this.proposta();
    return Array.isArray(p?.payload?.titulares) ? p!.payload.titulares : [];
  });

  empresaPayload = computed(() => this.proposta()?.payload?.empresa ?? null);

  documentosPayload = computed(() => {
    const docs = this.proposta()?.payload?.documentos ?? [];
    return Array.isArray(docs) ? docs : [];
  });

  pagamentoAtual = computed(() => {
    const list = this.proposta()?.payload?.pagamentos ?? [];
    return Array.isArray(list) && list.length > 0
      ? list[list.length - 1]
      : null;
  });

  assinatura = computed(() => this.proposta()?.payload?.assinatura ?? null);

  constructor() {
    addIcons({
      documentTextOutline,
      pencilOutline,
      qrCodeOutline,
      barcodeOutline,
      cameraOutline,
      copyOutline,
      checkmarkCircleOutline,
      checkmarkOutline,
      closeCircleOutline,
      trashOutline,
      eyeOutline,
      cloudDoneOutline,
      sparklesOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID inválido.');
      this.loading.set(false);
      return;
    }
    try {
      await this.recarregar(id);
    } catch (err: unknown) {
      this.error.set(this.msg(err, 'Não foi possível carregar a proposta.'));
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.pararPolling();
  }

  private async recarregar(id: string): Promise<void> {
    const p = await this.service.detalhe(id);
    this.proposta.set(p);
    await this.renderQrSeNecessario();
    this.gerirPolling();
  }

  private async renderQrSeNecessario(): Promise<void> {
    const pay = this.pagamentoAtual();
    if (pay?.metodo === 'PIX' && pay.copiaColaMock) {
      try {
        const url = await QRCode.toDataURL(pay.copiaColaMock, {
          width: 280,
          margin: 1,
        });
        this.qrDataUrl.set(url);
      } catch {
        this.qrDataUrl.set(null);
      }
    } else {
      this.qrDataUrl.set(null);
    }
  }

  private gerirPolling(): void {
    const p = this.proposta();
    if (p?.status === 'AGUARDANDO_PAGAMENTO' && !this.pollHandle) {
      this.pollHandle = setInterval(() => {
        if (this.proposta()?.id) {
          void this.service
            .detalhe(this.proposta()!.id)
            .then(async (atual) => {
              this.proposta.set(atual);
              await this.renderQrSeNecessario();
              if (atual.status !== 'AGUARDANDO_PAGAMENTO') {
                this.pararPolling();
                this.notice.set('Pagamento confirmado. Proposta transmitida.');
              }
            })
            .catch(() => {});
        }
      }, 3000);
    } else if (p?.status !== 'AGUARDANDO_PAGAMENTO') {
      this.pararPolling();
    }
  }

  private pararPolling(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  private async exec(
    descricao: string | null,
    fn: () => Promise<PropostaDetalhe>,
  ): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      const updated = await fn();
      this.proposta.set(updated);
      await this.renderQrSeNecessario();
      this.gerirPolling();
      if (descricao) this.notice.set(descricao);
    } catch (err: unknown) {
      this.error.set(this.msg(err, 'Falha na operação.'));
    } finally {
      this.busy.set(false);
    }
  }

  onTipoDocChange(v: string | number | undefined): void {
    if (typeof v === 'string') this.tipoDocSelecionado.set(v as TipoDocumento);
  }

  async anexarDocComCamera(): Promise<void> {
    const p = this.proposta();
    if (!p) return;
    this.error.set(null);
    this.notice.set(null);
    this.uploading.set(true);
    try {
      const { dataUrl } = await this.documentosService.capturar();
      if (!dataUrl) throw new Error('Sem imagem capturada.');
      const blob = await this.documentosService.comprimir(dataUrl);
      const nome = `${this.tipoDocSelecionado().toLowerCase()}-${Date.now()}.jpg`;
      const updated = await this.documentosService.upload(
        p.id,
        this.tipoDocSelecionado(),
        blob,
        nome,
      );
      this.proposta.set(updated);
      this.notice.set(
        `Documento enviado (${Math.round(blob.size / 1024)} KB).`,
      );
    } catch (err: unknown) {
      this.error.set(this.msg(err, 'Falha ao anexar documento.'));
    } finally {
      this.uploading.set(false);
    }
  }

  async verDocumento(docId: string): Promise<void> {
    const p = this.proposta();
    if (!p) return;
    try {
      const { url } = await this.documentosService.urlPresigned(p.id, docId);
      await Browser.open({ url });
    } catch (err: unknown) {
      this.error.set(this.msg(err, 'Falha ao abrir documento.'));
    }
  }

  concluirDocs(): Promise<void> {
    const p = this.proposta();
    if (!p) return Promise.resolve();
    return this.exec('Documentos concluídos. Avance para assinatura.', () =>
      this.service.concluirDocs(p.id),
    );
  }

  async assinarComCanvas(): Promise<void> {
    const p = this.proposta();
    if (!p) return;
    const modal = await this.modalCtrl.create({
      component: SignatureModalComponent,
    });
    await modal.present();
    const { data, role } = await modal.onDidDismiss<string>();
    if (role !== 'confirm' || !data) return;
    await this.exec('Assinatura registrada. PDF gerado.', () =>
      this.service.assinar(p.id, data),
    );
  }

  async verPdfAssinado(): Promise<void> {
    const p = this.proposta();
    if (!p) return;
    try {
      const { url } = await this.service.urlAssinatura(p.id);
      await Browser.open({ url });
    } catch (err: unknown) {
      this.error.set(this.msg(err, 'Falha ao abrir PDF.'));
    }
  }

  gerarPagamento(metodo: MetodoPagamento): Promise<void> {
    const p = this.proposta();
    if (!p) return Promise.resolve();
    return this.exec(`Pagamento ${metodo} gerado.`, () =>
      this.service.gerarPagamento(p.id, metodo),
    );
  }

  cancelar(): Promise<void> {
    const p = this.proposta();
    if (!p) return Promise.resolve();
    return this.exec('Proposta cancelada.', () => this.service.cancelar(p.id));
  }

  copiar(text: string): void {
    if (navigator?.clipboard) {
      void navigator.clipboard.writeText(text);
      this.notice.set('Código copiado.');
    }
  }

  private msg(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const inner = (err as { error?: { message?: string | string[] } }).error;
      if (inner?.message) {
        return Array.isArray(inner.message)
          ? inner.message.join('; ')
          : inner.message;
      }
    }
    if (err instanceof Error) return err.message;
    return fallback;
  }
}
