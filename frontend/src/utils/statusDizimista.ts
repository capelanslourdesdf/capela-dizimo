import type { Devolucao, Dizimista } from '@/types'
import { competenciaAtual, competenciasEntre } from '@/utils/format'
import { competenciaDaDevolucao } from '@/services/devolucaoService'

export type StatusDizimista = 'ativo' | 'inativo'

export const MESES_PARA_INATIVO_PADRAO = 5

/** Competência ("aaaa-mm") a partir da qual passamos a cobrar/acompanhar as devoluções. */
export function competenciaDeRegistro(dizimista: Pick<Dizimista, 'recadastradoEm' | 'criadoEm'>): string {
  return (dizimista.recadastradoEm || dizimista.criadoEm || '').slice(0, 7)
}

/**
 * Um dizimista fica **inativo** quando os últimos `mesesLimite` meses aplicáveis (a partir do mês
 * atual, voltando até o registro no site) estão todos sem devolução — ou seja, `mesesLimite`
 * meses seguidos sem pagar. Caso contrário (pagou em algum desses últimos meses, ou ainda não
 * completou `mesesLimite` meses de registro), fica **ativo**.
 *
 * Meses anteriores ao registro no site nunca contam contra o dizimista.
 */
export function calcularStatusDizimista(
  registro: string,
  competenciasPagas: Set<string>,
  mesesLimite: number = MESES_PARA_INATIVO_PADRAO,
  competenciaReferencia: string = competenciaAtual(),
): StatusDizimista {
  if (!registro || registro > competenciaReferencia) return 'ativo'

  const aplicaveis = competenciasEntre(registro, competenciaReferencia)

  let streakSemPagar = 0
  for (let i = aplicaveis.length - 1; i >= 0; i--) {
    if (competenciasPagas.has(aplicaveis[i])) break
    streakSemPagar++
  }

  return streakSemPagar >= mesesLimite ? 'inativo' : 'ativo'
}

export function competenciasPagasDoDizimista(devolucoes: Devolucao[]): Set<string> {
  return new Set(devolucoes.map(competenciaDaDevolucao))
}
