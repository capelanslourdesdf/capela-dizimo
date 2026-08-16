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
  endereco: Endereco
  telefone: string
  email?: string | null
  conjuge?: FamiliarBasico | null
  filhos: FamiliarBasico[]
  origem: OrigemCadastro
  criadoEm: string
  atualizadoEm: string
}

export type DadosCadastraisDizimista = Omit<Dizimista, 'numeroCarne' | 'origem' | 'criadoEm' | 'atualizadoEm'>

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

export type FormaPagamentoDevolucao = 'pix' | 'dinheiro' | 'transferencia' | 'cheque'

export interface Devolucao {
  id: string
  valor: number
  formaPagamento: FormaPagamentoDevolucao
  data: string
  observacao?: string
  criadoEm: string
}
