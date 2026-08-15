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
}

export type OrigemCadastro = 'recadastramento' | 'cadastro_admin'

export interface Dizimista {
  numeroCarne: string
  nomeCompleto: string
  dataNascimento: string
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
