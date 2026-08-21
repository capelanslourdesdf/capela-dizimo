import type { Devolucao, Dizimista } from '@/types'
import { competenciaAtual, competenciasEntre, subtrairMeses } from '@/utils/format'
import { competenciaDaDevolucao } from '@/services/devolucaoService'
import { COMPETENCIA_INICIAL_TESOURARIA } from '@/constants/tesouraria'

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
 * A janela conta a partir do início do acompanhamento no site (`COMPETENCIA_INICIAL_TESOURARIA`,
 * agosto de 2026) — meses anteriores ao recadastramento pessoal de quem já era dizimista antes
 * também contam contra ele; só não tem como cobrar meses de antes do site existir. Nos primeiros
 * meses depois do lançamento, quando a janela ainda não completou 6 meses, o mínimo exigido é
 * reduzido proporcionalmente (não dá pra exigir 3 meses pagos numa janela que só teve 1).
 */
export function calcularStatusDizimista(
  registro: string,
  competenciasPagas: Set<string>,
  minimoMeses: number = MINIMO_MESES_ATIVOS_PADRAO,
  competenciaReferencia: string = competenciaAtual(),
): StatusDizimista {
  if (!registro || registro > competenciaReferencia) return 'ativo'

  const inicioJanela = subtrairMeses(competenciaReferencia, JANELA_MESES_STATUS - 1)
  const inicioAplicavel = inicioJanela < COMPETENCIA_INICIAL_TESOURARIA ? COMPETENCIA_INICIAL_TESOURARIA : inicioJanela
  const janela = competenciasEntre(inicioAplicavel, competenciaReferencia)

  const minimoEfetivo = Math.min(minimoMeses, janela.length)
  const mesesPagos = janela.filter((c) => competenciasPagas.has(c)).length
  return mesesPagos >= minimoEfetivo ? 'ativo' : 'inativo'
}

export function competenciasPagasDoDizimista(devolucoes: Devolucao[]): Set<string> {
  return new Set(devolucoes.map(competenciaDaDevolucao))
}

/**
 * Quantos meses seguidos (sem buraco) o dizimista devolveu, contando pra trás a partir do mês
 * mais recente já pago — o mês atual, se ainda não tiver sido pago, não quebra a sequência (ele
 * pode simplesmente ainda não ter chegado a hora de devolver este mês).
 */
export function calcularMesesConsecutivos(
  competenciasPagas: Set<string>,
  competenciaReferencia: string = competenciaAtual(),
): number {
  let mes = competenciaReferencia
  while (!competenciasPagas.has(mes) && mes >= COMPETENCIA_INICIAL_TESOURARIA) {
    mes = subtrairMeses(mes, 1)
  }

  let contador = 0
  while (competenciasPagas.has(mes)) {
    contador++
    mes = subtrairMeses(mes, 1)
  }
  return contador
}
