import type { FormaPagamentoDevolucao } from '@/types'

export const FORMAS_PAGAMENTO_DEVOLUCAO: { value: FormaPagamentoDevolucao; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'dinheiro', label: 'Dinheiro' },
]

/**
 * Rótulo da forma de pagamento. Aceita `string` porque lançamentos antigos podem ter valores
 * que saíram da lista (ex.: "transferencia", "cheque") — nesses casos exibimos o valor salvo.
 */
export function formaPagamentoLabel(forma: string): string {
  return FORMAS_PAGAMENTO_DEVOLUCAO.find((f) => f.value === forma)?.label ?? forma
}
