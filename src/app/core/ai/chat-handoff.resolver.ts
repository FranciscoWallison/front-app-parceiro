import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular/standalone';
import { AuthService } from '../auth/auth.service';
import { DocumentosService } from '../documentos/documentos.service';
import { PropostasService } from '../propostas/propostas.service';
import { SignatureModalComponent } from '../../shared/signature/signature-modal.component';
import { Handoff, ToastTone } from './ai-chat.types';

/**
 * Executa handoffs emitidos pelo backend de IA.
 *
 * Por que isolado num service: a `chat.page` fica burra (renderiza tool chips
 * e delega execução). Resolver é re-utilizável de qualquer lugar onde o app
 * precisar "obedecer" uma instrução vinda do LLM (ex: notificação push
 * acionando uma ação).
 *
 * Por que confirmação no resolver (não na page): a regra "essa ação é
 * destrutiva → pergunte antes" é POLÍTICA do app, não escolha de UI. Manter
 * aqui evita uma página esquecer o `confirm`.
 */
@Injectable({ providedIn: 'root' })
export class ChatHandoffResolver {
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly modalCtrl = inject(ModalController);
  private readonly auth = inject(AuthService);
  private readonly documentos = inject(DocumentosService);
  private readonly propostas = inject(PropostasService);

  /**
   * Executa o handoff. Resolve `true` se a ação foi efetivada, `false` se o
   * usuário cancelou um confirm ou erro recuperável.
   */
  async executar(h: Handoff): Promise<boolean> {
    switch (h.kind) {
      case 'OPEN_PROPOSTA_DETALHE':
        await this.router.navigate(['/propostas', h.propostaId]);
        return true;

      case 'OPEN_WIZARD_PF':
        await this.router.navigate(['/propostas/nova-pf']);
        return true;

      case 'OPEN_WIZARD_PME':
        await this.router.navigate(['/propostas/nova-pme']);
        return true;

      case 'OPEN_LISTA_PROPOSTAS':
        await this.router.navigate(['/propostas'], {
          queryParams: {
            status: h.filtroStatus ?? null,
            tipo: h.filtroTipo ?? null,
          },
          queryParamsHandling: 'merge',
        });
        return true;

      case 'OPEN_ADMIN':
        await this.router.navigate(['/admin/propostas']);
        return true;

      case 'OPEN_PERFIL':
        await this.router.navigate(['/perfil'], { fragment: h.focar });
        return true;

      case 'SHOW_TOAST':
        await this.exibirToast(h.mensagem, h.tone);
        return true;

      case 'OPEN_CAMERA':
        return this.executarComCamera(h.propostaId, h.tipoDocumento);

      case 'OPEN_SIGNATURE_MODAL':
        return this.executarComAssinatura(h.propostaId);

      case 'DO_LOGOUT':
        return this.executarLogout();
    }
  }

  // ===========================================================================
  // Implementações detalhadas dos handoffs interativos
  // ===========================================================================

  private async exibirToast(mensagem: string, tone: ToastTone = 'info'): Promise<void> {
    const color = tone === 'info' ? 'medium' : tone;
    const t = await this.toastCtrl.create({
      message: mensagem,
      duration: 3000,
      position: 'bottom',
      color,
    });
    await t.present();
  }

  private async executarComCamera(propostaId: string, tipoDocumento: string): Promise<boolean> {
    const confirmado = await this.confirmar(
      'Abrir câmera?',
      `Vou abrir a câmera para anexar o documento "${tipoDocumento}" na proposta. Continuar?`,
      'Abrir',
    );
    if (!confirmado) return false;

    try {
      const { dataUrl } = await this.documentos.capturar();
      if (!dataUrl) {
        await this.exibirToast('Nenhuma foto capturada.', 'warning');
        return false;
      }
      const blob = await this.documentos.comprimir(dataUrl);
      const nome = `${tipoDocumento.toLowerCase()}-${Date.now()}.jpg`;
      await this.documentos.upload(propostaId, tipoDocumento as never, blob, nome);
      await this.exibirToast('Documento anexado.', 'success');
      await this.router.navigate(['/propostas', propostaId]);
      return true;
    } catch (err: unknown) {
      await this.exibirToast(this.msg(err, 'Falha ao anexar documento.'), 'danger');
      return false;
    }
  }

  private async executarComAssinatura(propostaId: string): Promise<boolean> {
    const confirmado = await this.confirmar(
      'Abrir tela de assinatura?',
      `Você precisa assinar no canvas com o dedo. Posso abrir agora?`,
      'Assinar',
    );
    if (!confirmado) return false;

    try {
      const modal = await this.modalCtrl.create({
        component: SignatureModalComponent,
      });
      await modal.present();
      const { data, role } = await modal.onDidDismiss<string>();
      if (role !== 'confirm' || !data) return false;
      await this.propostas.assinar(propostaId, data);
      await this.exibirToast('Assinatura registrada.', 'success');
      await this.router.navigate(['/propostas', propostaId]);
      return true;
    } catch (err: unknown) {
      await this.exibirToast(this.msg(err, 'Falha ao assinar.'), 'danger');
      return false;
    }
  }

  private async executarLogout(): Promise<boolean> {
    const confirmado = await this.confirmar(
      'Sair da conta?',
      'Você vai precisar logar de novo. Continuar?',
      'Sair',
      'destructive',
    );
    if (!confirmado) return false;

    try {
      await this.auth.logout();
      await this.router.navigate(['/login']);
      return true;
    } catch (err: unknown) {
      await this.exibirToast(this.msg(err, 'Falha ao deslogar.'), 'danger');
      return false;
    }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private async confirmar(
    header: string,
    message: string,
    confirmText: string,
    role: 'destructive' | 'confirm' = 'confirm',
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(false) },
          { text: confirmText, role, handler: () => resolve(true) },
        ],
      });
      await alert.present();
    });
  }

  private msg(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const inner = (err as { error?: { message?: string } }).error;
      if (inner?.message) return inner.message;
    }
    if (err instanceof Error) return err.message;
    return fallback;
  }
}
