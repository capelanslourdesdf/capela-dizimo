import type { Devolucao, Dizimista } from '@/types'
import { competenciaAtual, competenciasEntre, subtrairMeses } from '@/utils/format'
import { competenciaDaDevolucao } from '@/services/devolucaoService'
import { COMPETENCIA_INICIAL_TESOURARIA } from '@/constants/tesouraria'

export type StatusDizimista = 'ativo' | 'inativo'

/** Janela fixa de acompanhamento: os últimos 6 meses, contados a partir do mês atual. */
export const JANELA_MESES_STATUS = 6

export const MINIMO_MESES_ATIVOS_PADRAO = 3

/**
 * Competência ("aaaa-mm") a partir da qual passamos a cobrar/acompanhar as devoluções — ou vazia,
 * quando não há um marco confiável e a janela deve valer por inteiro (ver abaixo).
 *
 * `recadastradoEm` é sempre o marco certo: é o momento real em que a pessoa passou a ser
 * acompanhada digitalmente. Na ausência dele, `criadoEm` só serve de marco pra quem foi cadastrado
 * direto pelo admin (`cadastro_admin`) — ali a criação É o início real. Pra quem veio da
 * importação da planilha antiga (`importacao_planilha`) sem nunca ter se recadastrado, `criadoEm`
 * é só a data em que o script de importação rodou (a mesma pra centenas de registros de uma vez) —
 * não diz nada sobre desde quando a pessoa é dizimista. Usá-la como marco cortaria fora devoluções
 * antigas e legítimas dessas pessoas; por isso devolve vazio, o que remove o limite inferior da
 * janela — deixa contar todo o histórico de devolução que já existir.
 */
export function competenciaDeRegistro(dizimista: Pick<Dizimista, 'recadastradoEm' | 'criadoEm' | 'origem'>): string {
  if (dizimista.recadastradoEm) return dizimista.recadastradoEm.slice(0, 7)
  if (dizimista.origem === 'importacao_planilha') return ''
  return (dizimista.criadoEm || '').slice(0, 7)
}

/**
 * A regra é simples: dos últimos `JANELA_MESES_STATUS` (6) meses a partir do mês atual, se o
 * dizimista devolveu em pelo menos `minimoMeses` deles, fica **ativo** — caso contrário,
 * **inativo**.
 *
 * A janela nunca recua antes do registro do próprio dizimista (`competenciaDeRegistro`), quando
 * ele existe — não dá pra cobrar mês de antes dele existir na base. Por isso, pra quem se
 * cadastrou há menos de 6 meses, a janela é mais curta e o mínimo exigido é reduzido na mesma
 * proporção (não dá pra exigir 3 meses pagos numa janela que só teve 1). Quando não há registro
 * confiável (`registro` vazio — ver `competenciaDeRegistro`), a janela é sempre os 6 meses
 * completos, sem limite inferior algum.
 */
export function calcularStatusDizimista(
  registro: string,
  competenciasPagas: Set<string>,
  minimoMeses: number = MINIMO_MESES_ATIVOS_PADRAO,
  competenciaReferencia: string = competenciaAtual(),
): StatusDizimista {
  if (registro && registro > competenciaReferencia) return 'ativo'

  const inicioJanela = subtrairMeses(competenciaReferencia, JANELA_MESES_STATUS - 1)
  const inicioAplicavel = registro && inicioJanela < registro ? registro : inicioJanela
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
