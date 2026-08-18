import { addDoc, collection, collectionGroup, getDocs, orderBy, query } from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { Devolucao, FormaPagamentoDevolucao } from '@/types'

export async function listarDevolucoes(numeroCarne: string): Promise<Devolucao[]> {
  const ref = collection(db, 'dizimistas', numeroCarne, 'devolucoes')
  const snap = await getDocs(query(ref, orderBy('criadoEm', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Devolucao, 'id'>) }))
}

/**
 * Todas as devoluções de todos os dizimistas, agrupadas por nº do carnê. Usa uma
 * collection group query (uma única leitura em lote) em vez de uma consulta por dizimista —
 * necessário para calcular o status ativo/inativo da lista inteira sem explodir o número de
 * leituras no Firestore.
 */
export async function listarTodasDevolucoesPorCarne(): Promise<Record<string, Devolucao[]>> {
  const snap = await getDocs(collectionGroup(db, 'devolucoes'))
  const porCarne: Record<string, Devolucao[]> = {}

  snap.docs.forEach((d) => {
    const numeroCarne = d.ref.parent.parent?.id
    if (!numeroCarne) return
    const devolucao: Devolucao = { id: d.id, ...(d.data() as Omit<Devolucao, 'id'>) }
    ;(porCarne[numeroCarne] ??= []).push(devolucao)
  })

  return porCarne
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

export async function lancarDevolucao(numeroCarne: string, dados: DadosDevolucao): Promise<void> {
  const ref = collection(db, 'dizimistas', numeroCarne, 'devolucoes')
  await addDoc(ref, {
    ...dados,
    observacao: dados.observacao?.trim() || null,
    // Data em que a Pastoral registrou o lançamento (diferente da competência).
    criadoEm: new Date().toISOString(),
  })
}
