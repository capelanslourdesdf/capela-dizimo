export interface Endereco {
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
}

export interface FamiliarBasico {
  nomeCompleto: string
  dataNascimento: string
  /** Preenchido nos registros importados da planilha antiga, que não traz o ano. */
  diaMesNascimento?: string
}

export type OrigemCadastro = 'recadastramento' | 'cadastro_admin' | 'importacao_planilha'

export interface Dizimista {
  numeroCarne: string
  nomeCompleto: string
  /** Data completa "aaaa-mm-dd". Pode vir vazia em registros importados da planilha antiga. */
  dataNascimento: string
  /**
   * Dia e mês de nascimento ("dd/mm"), usado no login. Sempre preenchido: nos registros
   * importados vem direto da planilha (que não tem o ano) e, quando há data completa,
   * é derivado dela.
   */
  diaMesNascimento?: string
  /** Legado: coletado em recadastramentos antigos. O formulário atual não pede mais endereço. */
  endereco?: Endereco
  telefone: string
  /** Legado: o formulário atual não pede mais e-mail. */
  email?: string | null
  /** Legado: o formulário atual não pede mais cônjuge. */
  conjuge?: FamiliarBasico | null
  /** Legado: o formulário atual não pede mais filhos. */
  filhos?: FamiliarBasico[]
  origem: OrigemCadastro
  /** Legado: o formulário atual não pede mais responsável pelo recadastramento. */
  responsavelRecadastramento?: string
  /**
   * Quando o dizimista se recadastrou no site. É a data de referência para cobrar/acompanhar as
   * devoluções — nada antes disso é considerado pendente.
   */
  recadastradoEm?: string
  criadoEm: string
  atualizadoEm: string
}

export type DadosCadastraisDizimista = Omit<
  Dizimista,
  'numeroCarne' | 'origem' | 'criadoEm' | 'atualizadoEm' | 'recadastradoEm'
>

export type StatusPagamento = 'pendente' | 'aprovado' | 'rejeitado'

export interface PagamentoPix {
  id: string
  valor: number
  competencia: string
  status: StatusPagamento
  mercadoPagoPaymentId?: string
  pixCopiaCola?: string
  pixQrCodeBase64?: string
  criadoEm: string
  atualizadoEm: string
}

export type FormaPagamentoDevolucao = 'pix' | 'cartao' | 'dinheiro'

export interface Devolucao {
  id: string
  valor: number
  formaPagamento: FormaPagamentoDevolucao
  /** Mês/ano a que a devolução se refere ("aaaa-mm") — permite lançar retroativo. */
  competencia: string
  /** Nome do membro da Pastoral que fez o lançamento. */
  lancadoPor: string
  /** Data/hora em que a Pastoral registrou o lançamento no site. */
  criadoEm: string
  observacao?: string
  /** Lançamentos antigos guardavam só a data do pagamento, sem competência. */
  data?: string
}

export interface MembroPastoral {
  id: string
  nome: string
  criadoEm: string
}

export type CategoriaEntradaTesouraria =
  | 'dizimo'
  | 'oferta'
  | 'bazar'
  | 'lojinha'
  | 'eventos'
  | 'acao_solidaria'
  | 'doacoes'

export interface EntradaTesouraria {
  id: string
  /** Data "aaaa-mm-dd" em que a receita entrou. */
  data: string
  categoria: CategoriaEntradaTesouraria
  valor: number
  formaPagamento: FormaPagamentoDevolucao
  observacao?: string
}

export interface SaidaTesouraria {
  id: string
  /** Data "aaaa-mm-dd" em que a saída ocorreu. */
  dia: string
  solicitante: string
  /** Empresa ou prestador de serviço que recebeu o pagamento. */
  prestador: string
  valor: number
  /** Controle de "em dia": true quando a despesa já foi paga ao solicitante/prestador. */
  quitado: boolean
  observacao?: string
}

export type StatusControleTesouraria = 'em_andamento' | 'fechado'

/**
 * Controle financeiro de um mês/ano da Tesouraria. Um documento por competência
 * (id = "aaaa-mm"), com entradas e saídas embutidas no próprio documento — o volume é baixo
 * (uma paróquia, poucos lançamentos por mês) e isso permite editar tudo de uma vez só (rascunho
 * na tela, salva tudo junto), em vez de sincronizar subcoleções lançamento a lançamento.
 */
export interface ControleTesouraria {
  competencia: string
  status: StatusControleTesouraria
  entradas: EntradaTesouraria[]
  saidas: SaidaTesouraria[]
  criadoEm: string
  atualizadoEm: string
}

/** Visão simplificada por evento (só o total arrecadado e a despesa, sem detalhar categorias). */
export interface EventoTesouraria {
  id: string
  nome: string
  ano: number
  arrecadado: number
  despesa: number
  observacao?: string
  criadoEm: string
  atualizadoEm: string
}
