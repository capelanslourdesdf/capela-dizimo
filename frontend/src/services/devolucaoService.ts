import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { Devolucao, FormaPagamentoDevolucao } from '@/types'
import { comCache, invalidarCache } from '@/lib/cacheLeitura'
import { normalizarNumeroCarne } from '@/utils/format'
import { buscarDizimistaPorCarne } from '@/services/dizimistaService'
import { obterMinimoMesesAtivos } from '@/services/configuracaoService'
import { registrarMudancaStatus } from '@/services/statusAgregadoService'
import { calcularStatusDizimista, competenciaDeRegistro, competenciasPagasDoDizimista } from '@/utils/statusDizimista'
import { CARNE_AVULSO } from '@/constants/devolucao'

const REF_TOTAIS_POR_ANO = doc(db, 'agregados', 'totaisDevolucaoPorAno')
const CHAVE_CACHE_TOTAIS_POR_ANO = 'totais-devolucao-por-ano'
const CHAVE_CACHE_TOTAIS_POR_MES = 'totais-devolucao-por-mes'

function anoDaCompetencia(competencia: string): string {
  return competencia.slice(0, 4)
}

/**
 * Ajusta os totais agregados por ano E por mês (mesmo documento, dois mapas — `totais` e
 * `totaisPorMes` — mantidos incrementalmente a cada gravação) em vez de somar o histórico inteiro
 * toda vez que alguém consulta "Total arrecadado por ano" ou o gráfico de evolução mensal — em
 * escala (milhares de dizimistas, anos de histórico), reler tudo pra somar seria a leitura mais
 * cara do site, crescendo pra sempre. `increment()` é atômico: seguro mesmo com gravações
 * concorrentes, sem precisar de transação.
 *
 * Recebe os ajustes por COMPETÊNCIA ("aaaa-mm", não só o ano) — permite ao mesmo tempo somar no mês
 * certo e, agrupando por `anoDaCompetencia`, no ano certo, mesmo quando duas competências do mesmo
 * ano aparecem na mesma chamada (ex.: edição que muda só o mês, dentro do mesmo ano).
 */
async function ajustarTotais(ajustesPorCompetencia: Record<string, number>): Promise<void> {
  const porAno: Record<string, number> = {}
  const porMes: Record<string, number> = {}

  for (const [competencia, delta] of Object.entries(ajustesPorCompetencia)) {
    if (!delta) continue
    const ano = anoDaCompetencia(competencia)
    porAno[ano] = (porAno[ano] ?? 0) + delta
    porMes[competencia] = (porMes[competencia] ?? 0) + delta
  }
  if (Object.keys(porAno).length === 0) return

  const totais = Object.fromEntries(Object.entries(porAno).map(([ano, delta]) => [ano, increment(delta)]))
  const totaisPorMes = Object.fromEntries(Object.entries(porMes).map(([mes, delta]) => [mes, increment(delta)]))

  await setDoc(REF_TOTAIS_POR_ANO, { totais, totaisPorMes }, { merge: true })
  invalidarCache(CHAVE_CACHE_TOTAIS_POR_ANO)
  invalidarCache(CHAVE_CACHE_TOTAIS_POR_MES)
}

/**
 * Total arrecadado em devoluções, por ano — vem do agregado mantido a cada gravação, não de somar
 * o histórico inteiro. Cacheado como as demais leituras de lista.
 */
export async function obterTotaisDevolucaoPorAno(): Promise<Record<string, number>> {
  return comCache(CHAVE_CACHE_TOTAIS_POR_ANO, async () => {
    const snap = await getDoc(REF_TOTAIS_POR_ANO)
    if (!snap.exists()) return {}
    return (snap.data() as { totais?: Record<string, number> }).totais ?? {}
  })
}

/**
 * Total arrecadado em devoluções, por competência ("aaaa-mm") — todos os meses já lançados, de
 * todos os anos. Vem do mesmo agregado, sem varrer o histórico. Quem usa filtra os 12 meses do ano
 * que interessa (ex.: gráfico de evolução mensal) — o mapa inteiro é pequeno (um número por mês, há
 * décadas de sobra dentro do limite de tamanho de um documento do Firestore).
 */
export async function obterTotaisDevolucaoPorMes(): Promise<Record<string, number>> {
  return comCache(CHAVE_CACHE_TOTAIS_POR_MES, async () => {
    const snap = await getDoc(REF_TOTAIS_POR_ANO)
    if (!snap.exists()) return {}
    return (snap.data() as { totaisPorMes?: Record<string, number> }).totaisPorMes ?? {}
  })
}

/**
 * Devoluções de um único dizimista — cacheada por 60s (chave inclui o carnê) porque é lida de
 * forma independente em várias telas da própria área do dizimista (Início, Devolver meu dízimo,
 * Minhas devoluções) e na ficha dele na área administrativa, muitas vezes na mesma visita.
 */
export async function listarDevolucoes(numeroCarne: string): Promise<Devolucao[]> {
  const carne = normalizarNumeroCarne(numeroCarne)
  return comCache(`devolucoes:carne:${carne}`, async () => {
    const ref = collection(db, 'dizimistas', carne, 'devolucoes')
    const snap = await getDocs(query(ref, orderBy('criadoEm', 'desc')))
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Devolucao, 'id'>) }))
  })
}

/**
 * Todas as devoluções de todos os dizimistas, agrupadas por nº do carnê. Usa uma
 * collection group query (uma única leitura em lote) em vez de uma consulta por dizimista —
 * necessário para calcular o status ativo/inativo da lista inteira sem explodir o número de
 * leituras no Firestore.
 *
 * `desde`/`ate` (competência "aaaa-mm", inclusive) filtram a consulta no próprio Firestore —
 * quem só precisa de um mês (ou de um intervalo curto) não paga o custo de ler o histórico
 * inteiro. Sem eles, o comportamento é o de sempre: lê tudo. Requer um índice de campo único
 * ("competencia", escopo "Collection group" habilitado) — confirmado que 100% das devoluções já
 * têm esse campo preenchido (ver `scripts/verificar-competencia-devolucoes.mjs`).
 *
 * Cacheada por 60s (a chave inclui o intervalo, pra uma leitura de um mês não ser reaproveitada
 * por engano numa tela que precisa do histórico completo, e vice-versa) — essa é a leitura mais
 * pesada do site e várias telas chamam ela na mesma navegação (Dizimistas, Lista de devoluções,
 * Tesouraria).
 */
export async function listarTodasDevolucoesPorCarne(desde?: string, ate?: string): Promise<Record<string, Devolucao[]>> {
  const chaveCache = `devolucoes:${desde ?? ''}:${ate ?? ''}`

  return comCache(chaveCache, async () => {
    const restricoes: QueryConstraint[] = []
    if (desde) restricoes.push(where('competencia', '>=', desde))
    if (ate) restricoes.push(where('competencia', '<=', ate))

    const snap = await getDocs(query(collectionGroup(db, 'devolucoes'), ...restricoes))
    const porCarne: Record<string, Devolucao[]> = {}

    snap.docs.forEach((d) => {
      const numeroCarne = d.ref.parent.parent?.id
      if (!numeroCarne) return
      const devolucao: Devolucao = { id: d.id, ...(d.data() as Omit<Devolucao, 'id'>) }
      ;(porCarne[numeroCarne] ??= []).push(devolucao)
    })

    return porCarne
  })
}

/**
 * Recalcula e grava o status (Ativo/Inativo) de UM dizimista depois de lançar, editar ou excluir
 * uma devolução dele — e ajusta o agregado de contagem (`statusAgregadoService.ts`) se o status
 * mudou. Sem isso, a tela de Dizimistas só saberia que alguém voltou a ficar Ativo no próximo
 * recálculo diário (ver `api/cron/recalcular-status.ts`), até 24h depois do lançamento.
 *
 * "000" (`CARNE_AVULSO`) não é um dizimista de verdade — não tem documento próprio, então não há
 * status para recalcular.
 */
async function recomputarStatusAposDevolucao(numeroCarne: string): Promise<void> {
  const carne = normalizarNumeroCarne(numeroCarne)
  if (carne === CARNE_AVULSO) return

  const [dizimista, devolucoes, minimo] = await Promise.all([
    buscarDizimistaPorCarne(carne),
    listarDevolucoes(carne),
    obterMinimoMesesAtivos(),
  ])
  if (!dizimista) return

  const statusAnterior = dizimista.status ?? null
  const statusNovo = calcularStatusDizimista(
    competenciaDeRegistro(dizimista),
    competenciasPagasDoDizimista(devolucoes),
    minimo,
  )
  if (statusAnterior === statusNovo) return

  await setDoc(doc(db, 'dizimistas', carne), { status: statusNovo }, { merge: true })
  await registrarMudancaStatus(statusAnterior, statusNovo)
  invalidarCache('dizimistas')
}

/**
 * Competência ("aaaa-mm") a que a devolução se refere. Lançamentos antigos guardavam apenas a
 * data do pagamento, então caímos nela (e, por último, na data do lançamento).
 */
export function competenciaDaDevolucao(devolucao: Devolucao): string {
  return devolucao.competencia || devolucao.data?.slice(0, 7) || devolucao.criadoEm.slice(0, 7)
}

export interface DadosDevolucao {
  valor: number
  formaPagamento: FormaPagamentoDevolucao
  /** Mês/ano de referência ("aaaa-mm") — permite lançar devolução retroativa. */
  competencia: string
  /** Membro da Pastoral responsável pelo lançamento. */
  lancadoPor: string
  observacao?: string
  /**
   * Dia exato da devolução ("aaaa-mm-dd"), coletado a partir de set/2026 — não influencia o status
   * do dizimista (que continua olhando só pra `competencia`); serve apenas para o calendário de
   * receitas da Tesouraria mostrar o dízimo no dia certo, em vez de tudo agregado no fim do mês.
   */
  data?: string
}

export interface GrupoDevolucoesPorMes {
  competencia: string
  devolucoes: Devolucao[]
  total: number
}

/**
 * Agrupa devoluções por competência (mês/ano). Um dizimista pode devolver mais de uma vez no
 * mesmo mês — o agrupamento deixa isso visível (em vez de parecer duplicado numa lista corrida) e
 * mostra quantas devoluções e quanto foi devolvido em cada mês. Ordenado do mês mais recente para
 * o mais antigo; dentro do mês, da devolução mais recente para a mais antiga.
 */
export function agruparDevolucoesPorCompetencia(devolucoes: Devolucao[]): GrupoDevolucoesPorMes[] {
  const porCompetencia = new Map<string, Devolucao[]>()

  for (const devolucao of devolucoes) {
    const competencia = competenciaDaDevolucao(devolucao)
    const lista = porCompetencia.get(competencia) ?? []
    lista.push(devolucao)
    porCompetencia.set(competencia, lista)
  }

  return Array.from(porCompetencia.entries())
    .map(([competencia, itens]) => ({
      competencia,
      devolucoes: [...itens].sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1)),
      total: itens.reduce((soma, item) => soma + item.valor, 0),
    }))
    .sort((a, b) => (a.competencia < b.competencia ? 1 : -1))
}

/**
 * Devolve a devolução recém-criada (com o `id` gerado) — quem chama pode atualizar a lista local
 * direto com esse retorno em vez de buscar tudo de novo no Firestore (importante em telas que
 * lançam várias devoluções seguidas, uma atrás da outra).
 */
export async function lancarDevolucao(numeroCarne: string, dados: DadosDevolucao): Promise<Devolucao> {
  const ref = collection(db, 'dizimistas', normalizarNumeroCarne(numeroCarne), 'devolucoes')
  const observacao = dados.observacao?.trim() || null
  const data = dados.data || null
  const criadoEm = new Date().toISOString()
  const novoDoc = await addDoc(ref, { ...dados, observacao, data, criadoEm })
  await ajustarTotais({ [dados.competencia]: dados.valor })
  invalidarCache('devolucoes')
  await recomputarStatusAposDevolucao(numeroCarne)
  return { id: novoDoc.id, ...dados, observacao: observacao ?? undefined, data: data ?? undefined, criadoEm }
}

/**
 * Corrige os dados de uma devolução já lançada. Só a área da Pastoral tem acesso a essa tela —
 * o dizimista só consulta o próprio histórico, nunca edita.
 */
export async function atualizarDevolucao(
  numeroCarne: string,
  devolucaoId: string,
  dados: DadosDevolucao,
): Promise<void> {
  const ref = doc(db, 'dizimistas', normalizarNumeroCarne(numeroCarne), 'devolucoes', devolucaoId)

  // Lê o valor/competência antigos antes de sobrescrever — precisa deles pra tirar do ano certo
  // do agregado antes de somar no ano novo (o valor e o mês podem mudar na edição).
  const anterior = await getDoc(ref)
  const dadosAnteriores = anterior.data() as Omit<Devolucao, 'id'> | undefined

  await updateDoc(ref, {
    ...dados,
    observacao: dados.observacao?.trim() || null,
    data: dados.data || null,
  })

  if (dadosAnteriores) {
    const competenciaAntiga = competenciaDaDevolucao(dadosAnteriores as Devolucao)
    const competenciaNova = dados.competencia
    await ajustarTotais(
      competenciaAntiga === competenciaNova
        ? { [competenciaNova]: dados.valor - dadosAnteriores.valor }
        : { [competenciaAntiga]: -dadosAnteriores.valor, [competenciaNova]: dados.valor },
    )
  }

  invalidarCache('devolucoes')
  await recomputarStatusAposDevolucao(numeroCarne)
}

/** Remove uma devolução lançada. Só a área da Pastoral tem acesso a essa ação. */
export async function excluirDevolucao(numeroCarne: string, devolucaoId: string): Promise<void> {
  const ref = doc(db, 'dizimistas', normalizarNumeroCarne(numeroCarne), 'devolucoes', devolucaoId)

  // Lê antes de excluir — precisa do valor/competência pra tirar do total do ano certo no agregado.
  const existente = await getDoc(ref)
  const dadosExistentes = existente.data() as Omit<Devolucao, 'id'> | undefined

  await deleteDoc(ref)

  if (dadosExistentes) {
    const competencia = competenciaDaDevolucao(dadosExistentes as Devolucao)
    await ajustarTotais({ [competencia]: -dadosExistentes.valor })
  }

  invalidarCache('devolucoes')
  await recomputarStatusAposDevolucao(numeroCarne)
}
