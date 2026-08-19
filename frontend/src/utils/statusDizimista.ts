import type { Devolucao, Dizimista } from '@/types'
import { competenciaAtual, competenciasEntre, subtrairMeses } from '@/utils/format'
import { competenciaDaDevolucao } from '@/services/devolucaoService'

export type StatusDizimista = 'ativo' | 'inativo'

/** Janela fixa de acompanhamento: os últimos 6 meses, contados a partir do mês atual. */
export const JANELA_MESES_STATUS = 6

export const MINIMO_MESES_ATIVOS_PADRAO = 3

/** Competência ("aaaa-mm") a partir da qual passamos a cobrar/acompanhar as devoluções. */
export function competenciaDeRegistro(dizimista: Pick<Dizimista, 'recadastradoEm' | 'criadoEm'>): string {
  return (dizimista.recadastradoEm || dizimista.criadoEm || '').slice(0, 7)
}

/**
 * Um dizimista fica **ativo** quando devolveu em pelo menos `minimoMeses` dos últimos
 * `JANELA_MESES_STATUS` (6) meses — caso contrário, **inativo**.
 *
 * Meses anteriores ao registro no site nunca contam contra o dizimista: se ele tem menos meses
 * de registro do que `minimoMeses`, ainda não há como avaliar (não daria nem tempo de atingir o
 * mínimo), então o benefício da dúvida é dado e ele fica ativo.
 */
export function calcularStatusDizimista(
  registro: string,
  competenciasPagas: Set<string>,
  minimoMeses: number = MINIMO_MESES_ATIVOS_PADRAO,
  competenciaReferencia: string = competenciaAtual(),
): StatusDizimista {
  if (!registro || registro > competenciaReferencia) return 'ativo'

  const inicioJanela = subtrairMeses(competenciaReferencia, JANELA_MESES_STATUS - 1)
  const janela = competenciasEntre(inicioJanela, competenciaReferencia)
  const aplicaveis = janela.filter((c) => c >= registro)

  if (aplicaveis.length < minimoMeses) return 'ativo'

  const mesesPagos = aplicaveis.filter((c) => competenciasPagas.has(c)).length
  return mesesPagos >= minimoMeses ? 'ativo' : 'inativo'
}

export function competenciasPagasDoDizimista(devolucoes: Devolucao[]): Set<string> {
  return new Set(devolucoes.map(competenciaDaDevolucao))
}
