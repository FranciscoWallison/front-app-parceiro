import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AlertController,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  checkmarkOutline,
  trashOutline,
} from 'ionicons/icons';
import { CepService } from '../../../core/cep/cep.service';
import { PlanosService } from '../../../core/planos/planos.service';
import { PropostasService } from '../../../core/propostas/propostas.service';
import {
  DependenteInput,
  Plano,
  TitularInput,
} from '../../../core/propostas/propostas.types';
import { digits, isValidCpf } from '../../../shared/masks/format.utils';
import {
  CepMaskDirective,
  CpfMaskDirective,
  TelefoneMaskDirective,
} from '../../../shared/masks/mask.directives';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { WizardStepperComponent } from '../../../shared/ui/wizard-stepper.component';

interface DependenteForm extends DependenteInput {
  uid: number;
}

@Component({
  selector: 'app-nova-pf',
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    CpfMaskDirective,
    CepMaskDirective,
    TelefoneMaskDirective,
    IonContent,
    IonFooter,
    IonIcon,
    IonSpinner,
    IonSelect,
    IonSelectOption,
    IonCheckbox,
    PageHeaderComponent,
    WizardStepperComponent,
  ],
  templateUrl: './nova-pf.page.html',
  styleUrls: ['./nova-pf.page.scss'],
})
export class NovaPfPage implements OnInit {
  private readonly propostas = inject(PropostasService);
  private readonly planosSvc = inject(PlanosService);
  private readonly cepSvc = inject(CepService);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);

  readonly STEP_LABELS = ['Titular', 'Endereço', 'Dependentes', 'Plano', 'Saúde'];
  readonly STEP_SUBTITLES: Record<number, { title: string; subtitle: string }> = {
    1: { title: 'Dados do titular', subtitle: 'Etapa 1 de 5 · informações pessoais' },
    2: { title: 'Endereço do titular', subtitle: 'Etapa 2 de 5 · endereço residencial' },
    3: { title: 'Dependentes', subtitle: 'Etapa 3 de 5 · familiares incluídos' },
    4: { title: 'Escolha o plano', subtitle: 'Etapa 4 de 5 · cobertura e mensalidade' },
    5: { title: 'Declaração de saúde', subtitle: 'Etapa 5 de 5 · revise e envie' },
  };

  cepBuscando = signal(false);

  step = signal(1);
  totalSteps = 5;

  loading = signal(false);
  errorMsg = signal<string | null>(null);

  planos = signal<Plano[]>([]);
  planoSelecionado = signal<Plano | null>(null);

  titular: TitularInput = {
    cpf: '',
    nome: '',
    dataNascimento: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  };
  dependentes = signal<DependenteForm[]>([]);
  declaracaoSaude = signal<Record<string, boolean>>({
    fumante: false,
    doencaCardiaca: false,
    diabetes: false,
    hipertensao: false,
  });

  valorTotalCents = computed(() => {
    const p = this.planoSelecionado();
    if (!p) return 0;
    const numDeps = this.dependentes().length;
    return p.valorTitularCents + numDeps * p.valorDependenteCents;
  });

  stepTitle = computed(() => this.STEP_SUBTITLES[this.step()].title);
  stepSubtitle = computed(() => this.STEP_SUBTITLES[this.step()].subtitle);

  toggleSaude(key: string, ev: Event): void {
    const checked = (ev as CustomEvent<{ checked: boolean }>)?.detail?.checked ?? false;
    this.declaracaoSaude.update((s) => ({ ...s, [key]: checked }));
  }

  constructor() {
    addIcons({ trashOutline, addOutline, checkmarkOutline });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.planos.set(await this.planosSvc.listar());
    } catch (err: unknown) {
      this.errorMsg.set(this.msg(err, 'Falha ao carregar planos.'));
    }
  }

  proximo(): void {
    this.errorMsg.set(null);
    if (!this.validarStep()) return;
    if (this.step() < this.totalSteps) this.step.update((s) => s + 1);
  }

  anterior(): void {
    if (this.step() > 1) this.step.update((s) => s - 1);
  }

  addDependente(): void {
    this.dependentes.update((arr) => [
      ...arr,
      {
        uid: Date.now() + Math.random(),
        cpf: '',
        nome: '',
        dataNascimento: '',
        parentesco: 'FILHO',
      },
    ]);
  }

  removeDependente(uid: number): void {
    this.dependentes.update((arr) => arr.filter((d) => d.uid !== uid));
  }

  selecionarPlano(planoId: string): void {
    const p = this.planos().find((x) => x.id === planoId);
    this.planoSelecionado.set(p ?? null);
  }

  async buscarCep(): Promise<void> {
    if (!this.titular.cep) return;
    this.cepBuscando.set(true);
    try {
      const res = await this.cepSvc.buscar(this.titular.cep);
      if (res) {
        this.titular.logradouro = res.logradouro || this.titular.logradouro;
        this.titular.bairro = res.bairro || this.titular.bairro;
        this.titular.cidade = res.cidade || this.titular.cidade;
        this.titular.uf = res.uf || this.titular.uf;
      }
    } finally {
      this.cepBuscando.set(false);
    }
  }

  async submeter(): Promise<void> {
    this.errorMsg.set(null);
    if (!this.validarStep()) return;
    if (!this.planoSelecionado()) {
      this.errorMsg.set('Selecione um plano.');
      await this.mostrarErro('Plano não selecionado', 'Volte ao passo 4 e selecione um plano.');
      return;
    }
    this.loading.set(true);
    try {
      const proposta = await this.propostas.criar({
        tipo: 'PF',
        planoId: this.planoSelecionado()!.id,
        titular: {
          ...this.titular,
          cpf: digits(this.titular.cpf),
          cep: digits(this.titular.cep),
          telefone: digits(this.titular.telefone),
          declaracaoSaude: this.declaracaoSaude(),
          dependentes: this.dependentes().map(({ uid: _, ...rest }) => ({
            ...rest,
            cpf: digits(rest.cpf),
          })),
        },
      });
      await this.propostas.simular(proposta.id);
      void this.router.navigate(['/propostas', proposta.id]);
    } catch (err: unknown) {
      const mensagem = this.msg(err, 'Falha ao criar proposta.');
      this.errorMsg.set(mensagem);
      await this.mostrarErro('Não foi possível criar a proposta', mensagem);
    } finally {
      this.loading.set(false);
    }
  }

  private async mostrarErro(header: string, message: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [{ text: 'Entendi', role: 'cancel' }],
    });
    await alert.present();
  }

  private validarStep(): boolean {
    const s = this.step();
    if (s === 1) {
      if (
        !this.titular.cpf ||
        !this.titular.nome ||
        !this.titular.dataNascimento ||
        !this.titular.email ||
        !this.titular.telefone
      ) {
        this.errorMsg.set('Preencha todos os dados pessoais.');
        return false;
      }
      if (!isValidCpf(this.titular.cpf)) {
        this.errorMsg.set('CPF do titular inválido.');
        return false;
      }
      const cpfsDeps = this.dependentes().map((d) => d.cpf).filter(Boolean);
      for (const cpfDep of cpfsDeps) {
        if (!isValidCpf(cpfDep)) {
          this.errorMsg.set(`CPF de dependente inválido: ${cpfDep}`);
          return false;
        }
      }
    }
    if (s === 2) {
      if (
        !this.titular.cep ||
        !this.titular.logradouro ||
        !this.titular.numero ||
        !this.titular.bairro ||
        !this.titular.cidade ||
        !this.titular.uf
      ) {
        this.errorMsg.set('Preencha o endereço completo.');
        return false;
      }
    }
    if (s === 4 && !this.planoSelecionado()) {
      this.errorMsg.set('Selecione um plano para continuar.');
      return false;
    }
    return true;
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
