import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonFooter,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  checkmarkOutline,
  trashOutline,
} from 'ionicons/icons';
import { PlanosService } from '../../../core/planos/planos.service';
import { PropostasService } from '../../../core/propostas/propostas.service';
import {
  EmpresaInput,
  Plano,
  TitularInput,
} from '../../../core/propostas/propostas.types';
import { digits } from '../../../shared/masks/format.utils';
import {
  CepMaskDirective,
  CnpjMaskDirective,
  CpfMaskDirective,
  TelefoneMaskDirective,
} from '../../../shared/masks/mask.directives';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { WizardStepperComponent } from '../../../shared/ui/wizard-stepper.component';

interface TitularForm extends TitularInput {
  uid: number;
}

@Component({
  selector: 'app-nova-pme',
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    CpfMaskDirective,
    CnpjMaskDirective,
    CepMaskDirective,
    TelefoneMaskDirective,
    IonContent,
    IonFooter,
    IonIcon,
    IonSpinner,
    PageHeaderComponent,
    WizardStepperComponent,
  ],
  templateUrl: './nova-pme.page.html',
  styleUrls: ['./nova-pme.page.scss'],
})
export class NovaPmePage implements OnInit {
  private readonly propostas = inject(PropostasService);
  private readonly planosSvc = inject(PlanosService);
  private readonly router = inject(Router);

  readonly STEP_LABELS = ['Empresa', 'Titulares', 'Plano', 'Resumo'];
  readonly STEP_SUBTITLES: Record<number, { title: string; subtitle: string }> = {
    1: { title: 'Dados da empresa', subtitle: 'Etapa 1 de 4 · informações cadastrais' },
    2: { title: 'Funcionários titulares', subtitle: 'Etapa 2 de 4 · vidas cobertas' },
    3: { title: 'Escolha o plano', subtitle: 'Etapa 3 de 4 · cobertura e mensalidade' },
    4: { title: 'Resumo', subtitle: 'Etapa 4 de 4 · revise e envie' },
  };

  step = signal(1);
  totalSteps = 4;

  loading = signal(false);
  errorMsg = signal<string | null>(null);

  planos = signal<Plano[]>([]);
  planoSelecionado = signal<Plano | null>(null);

  empresa: EmpresaInput = {
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    emailContato: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  };
  titulares = signal<TitularForm[]>([this.novoTitular()]);

  valorTotalCents = computed(() => {
    const p = this.planoSelecionado();
    if (!p) return 0;
    return this.titulares().length * p.valorTitularCents;
  });

  stepTitle = computed(() => this.STEP_SUBTITLES[this.step()].title);
  stepSubtitle = computed(() => this.STEP_SUBTITLES[this.step()].subtitle);

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

  private novoTitular(): TitularForm {
    return {
      uid: Date.now() + Math.random(),
      cpf: '',
      nome: '',
      dataNascimento: '',
      email: '',
      telefone: '',
      cep: this.empresa.cep,
      logradouro: this.empresa.logradouro,
      numero: this.empresa.numero,
      complemento: this.empresa.complemento,
      bairro: this.empresa.bairro,
      cidade: this.empresa.cidade,
      uf: this.empresa.uf,
    };
  }

  addTitular(): void {
    this.titulares.update((arr) => [...arr, this.novoTitular()]);
  }

  removeTitular(uid: number): void {
    this.titulares.update((arr) =>
      arr.length > 1 ? arr.filter((t) => t.uid !== uid) : arr,
    );
  }

  selecionarPlano(planoId: string): void {
    const p = this.planos().find((x) => x.id === planoId);
    this.planoSelecionado.set(p ?? null);
  }

  async submeter(): Promise<void> {
    this.errorMsg.set(null);
    if (!this.validarStep()) return;
    if (!this.planoSelecionado()) {
      this.errorMsg.set('Selecione um plano.');
      return;
    }
    this.loading.set(true);
    try {
      const empresaSanit = {
        ...this.empresa,
        cnpj: digits(this.empresa.cnpj),
        cep: digits(this.empresa.cep),
        telefone: digits(this.empresa.telefone),
      };
      const titularesPayload = this.titulares().map(({ uid: _, ...t }) => ({
        ...t,
        cpf: digits(t.cpf),
        telefone: digits(t.telefone),
        cep: digits(t.cep || this.empresa.cep),
        logradouro: t.logradouro || this.empresa.logradouro,
        numero: t.numero || this.empresa.numero,
        bairro: t.bairro || this.empresa.bairro,
        cidade: t.cidade || this.empresa.cidade,
        uf: t.uf || this.empresa.uf,
      }));
      const proposta = await this.propostas.criar({
        tipo: 'PME',
        planoId: this.planoSelecionado()!.id,
        empresa: empresaSanit,
        titulares: titularesPayload,
      });
      await this.propostas.simular(proposta.id);
      void this.router.navigate(['/propostas', proposta.id]);
    } catch (err: unknown) {
      this.errorMsg.set(this.msg(err, 'Falha ao criar proposta.'));
    } finally {
      this.loading.set(false);
    }
  }

  private validarStep(): boolean {
    const s = this.step();
    if (s === 1) {
      if (
        !this.empresa.cnpj ||
        !this.empresa.razaoSocial ||
        !this.empresa.nomeFantasia ||
        !this.empresa.emailContato ||
        !this.empresa.telefone ||
        !this.empresa.cep ||
        !this.empresa.logradouro ||
        !this.empresa.numero ||
        !this.empresa.bairro ||
        !this.empresa.cidade ||
        !this.empresa.uf
      ) {
        this.errorMsg.set('Preencha todos os dados da empresa.');
        return false;
      }
    }
    if (s === 2) {
      if (this.titulares().length === 0) {
        this.errorMsg.set('Adicione ao menos um titular.');
        return false;
      }
      for (const t of this.titulares()) {
        if (!t.cpf || !t.nome || !t.dataNascimento || !t.email || !t.telefone) {
          this.errorMsg.set('Preencha CPF, nome, data, email e telefone de cada titular.');
          return false;
        }
      }
    }
    if (s === 3 && !this.planoSelecionado()) {
      this.errorMsg.set('Selecione um plano.');
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
