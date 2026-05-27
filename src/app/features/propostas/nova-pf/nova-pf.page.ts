import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonProgressBar,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  arrowBack,
  arrowForward,
  checkmark,
  documentText,
  person,
  trash,
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
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonProgressBar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonCheckbox,
    IonRadioGroup,
    IonRadio,
    IonIcon,
    IonSpinner,
    IonText,
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

  cepBuscando = signal(false);

  step = signal(1);
  totalSteps = 5;
  progress = computed(() => this.step() / this.totalSteps);

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

  toggleSaude(key: string, ev: Event): void {
    const checked = (ev as CustomEvent<{ checked: boolean }>)?.detail?.checked ?? false;
    this.declaracaoSaude.update((s) => ({ ...s, [key]: checked }));
  }

  constructor() {
    addIcons({
      person,
      documentText,
      arrowBack,
      arrowForward,
      checkmark,
      add,
      trash,
    });
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
