export type TipoProposta = 'PF' | 'PME';

export type StatusProposta =
  | 'RASCUNHO'
  | 'SIMULADA'
  | 'AGUARDANDO_DOCS'
  | 'AGUARDANDO_ASSINATURA'
  | 'AGUARDANDO_PAGAMENTO'
  | 'TRANSMITIDA'
  | 'APROVADA'
  | 'RECUSADA'
  | 'CANCELADA';

export type TipoDocumento =
  | 'RG'
  | 'CNH'
  | 'COMPROVANTE_RESIDENCIA'
  | 'CONTRATO_SOCIAL'
  | 'CARTAO_CNPJ'
  | 'OUTRO';

export type MetodoPagamento = 'PIX' | 'BOLETO';

export interface Plano {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'ODONTO' | 'SAUDE';
  descricao: string;
  valorTitularCents: number;
  valorDependenteCents: number;
  carenciaMeses: number;
}

export interface DependenteInput {
  cpf: string;
  nome: string;
  dataNascimento: string;
  parentesco: string;
  declaracaoSaude?: Record<string, unknown>;
}

export interface TitularInput {
  cpf: string;
  nome: string;
  dataNascimento: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  declaracaoSaude?: Record<string, unknown>;
  dependentes?: DependenteInput[];
}

export interface EmpresaInput {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  emailContato: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface CriarPropostaInput {
  tipo: TipoProposta;
  planoId: string;
  observacoes?: string;
  titular?: TitularInput;
  empresa?: EmpresaInput;
  titulares?: TitularInput[];
}

export interface PropostaResumo {
  id: string;
  numero: number;
  tipo: TipoProposta;
  status: StatusProposta;
  planoNome: string;
  valorTotalCents: number;
  titularOuEmpresa: string;
  criadaEm: string;
  atualizadaEm: string;
}

export interface PropostaDetalhe extends PropostaResumo {
  payload: any;
}

export interface DashboardData {
  total: number;
  valorEmAbertoCents: number;
  contadores: Record<StatusProposta, number>;
  ultimas: Array<{
    id: string;
    numero: number;
    tipo: TipoProposta;
    status: StatusProposta;
    valorTotalCents: number;
    planoNome: string;
    titularOuEmpresa: string;
    atualizadaEm: string;
  }>;
}

export interface MaterialPromocional {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'PDF' | 'IMAGEM' | 'VIDEO' | 'LINK';
  thumbnail: string | null;
  ordem: number;
}

export interface FaqItem {
  id: string;
  pergunta: string;
  resposta: string;
  categoria: string;
  ordem: number;
}
