import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { Devolucao, FormaPagamentoDevolucao } from '@/types'
import { comCache, invalidarCache } from '@/lib/cacheLeitura'
import { normalizarNumeroCarne } from '@/utils/format'

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
  const criadoEm = new Date().toISOString()
  const novoDoc = await addDoc(ref, { ...dados, observacao, criadoEm })
  invalidarCache('devolucoes')
  return { id: novoDoc.id, ...dados, observacao: observacao ?? undefined, criadoEm }
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
  await updateDoc(ref, {
    ...dados,
    observacao: dados.observacao?.trim() || null,
  })
  invalidarCache('devolucoes')
}

/** Remove uma devolução lançada. Só a área da Pastoral tem acesso a essa ação. */
export async function excluirDevolucao(numeroCarne: string, devolucaoId: string): Promise<void> {
  await deleteDoc(doc(db, 'dizimistas', normalizarNumeroCarne(numeroCarne), 'devolucoes', devolucaoId))
  invalidarCache('devolucoes')
}
