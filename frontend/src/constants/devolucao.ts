import type { FormaPagamentoDevolucao } from '@/types'

export const FORMAS_PAGAMENTO_DEVOLUCAO: { value: FormaPagamentoDevolucao; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'dinheiro', label: 'Dinheiro' },
]

/**
 * Nº de carnê especial pra devolução avulsa (sem dizimista cadastrado — alguém que doou/dizimou
 * sem carnê). É só um caminho no Firestore (`dizimistas/000/devolucoes/...`); como nunca gravamos
 * um documento em `dizimistas/000`, nenhum "dizimista avulso" chega a existir — não aparece na
 * lista nem na busca, que só listam documentos reais da coleção.
 *
 * Puramente numérico (nunca um carnê real começa em zero) de propósito: fica digitável no teclado
 * numérico do celular e sai mais limpo em relatórios/analytics do que um valor textual. Quem
 * lança marca o checkbox "Devolução avulsa" — não precisa saber nem digitar esse valor.
 */
export const CARNE_AVULSO = '000'

/**
 * Rótulo da forma de pagamento. Aceita `string` porque lançamentos antigos podem ter valores
 * que saíram da lista (ex.: "transferencia", "cheque") — nesses casos exibimos o valor salvo.
 */
export function formaPagamentoLabel(forma: string): string {
  return FORMAS_PAGAMENTO_DEVOLUCAO.find((f) => f.value === forma)?.label ?? forma
}
