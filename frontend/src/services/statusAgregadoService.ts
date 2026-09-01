import { doc, getDoc, increment, setDoc, type FieldValue } from 'firebase/firestore'

import { db } from '@/lib/firebase'
import { comCache, invalidarCache } from '@/lib/cacheLeitura'
import type { StatusDizimista } from '@/utils/statusDizimista'

/**
 * Contagem de dizimistas Ativos/Inativos, num documento único mantido por incremento — mesmo
 * padrão de `obterTotaisDevolucaoPorAno` (devolucaoService.ts). Sem isso, mostrar "60 Ativos, 115
 * Inativos" exigiria reler o histórico de devolução da base inteira toda vez que alguém abre a
 * tela de Dizimistas.
 *
 * Só muda por incremento quando ALGUÉM grava algo (devolução lançada/editada/excluída, dizimista
 * criado). Isso não cobre quem muda de status sozinho, só pela passagem do tempo (ex.: parou de
 * devolver e, 6 meses depois, ninguém mexeu no cadastro dele) — esse caso é responsabilidade do
 * Cron diário (`api/cron/recalcular-status.ts`), que recalcula todo mundo do zero 1x por dia.
 */
const REF = doc(db, 'agregados', 'statusDizimistas')
const CHAVE_CACHE = 'status-dizimistas-agregado'

export interface ContagemStatus {
  ativos: number
  inativos: number
}

/** `StatusDizimista` ('ativo'/'inativo', singular) -> nome do campo no agregado (plural) — os nomes são diferentes de propósito, então nunca usar o status como chave direto. */
const CAMPO_POR_STATUS: Record<StatusDizimista, keyof ContagemStatus> = {
  ativo: 'ativos',
  inativo: 'inativos',
}

export async function obterContagemStatusAgregada(): Promise<ContagemStatus> {
  return comCache(CHAVE_CACHE, async () => {
    const snap = await getDoc(REF)
    const dados = snap.data() as Partial<ContagemStatus> | undefined
    return { ativos: dados?.ativos ?? 0, inativos: dados?.inativos ?? 0 }
  })
}

/**
 * Ajusta a contagem agregada quando o status de UM dizimista muda — incluindo a primeira vez que
 * ele é definido (`statusAnterior: null`, ex.: cadastro novo) e quando ele deixa de existir
 * (`statusNovo: null`, ex.: exclusão do dizimista).
 */
export async function registrarMudancaStatus(
  statusAnterior: StatusDizimista | null,
  statusNovo: StatusDizimista | null,
): Promise<void> {
  if (statusAnterior === statusNovo) return

  const ajustes: Partial<Record<keyof ContagemStatus, FieldValue>> = {}
  if (statusAnterior) ajustes[CAMPO_POR_STATUS[statusAnterior]] = increment(-1)
  if (statusNovo) ajustes[CAMPO_POR_STATUS[statusNovo]] = increment(1)
  if (Object.keys(ajustes).length === 0) return

  await setDoc(REF, ajustes, { merge: true })
  invalidarCache(CHAVE_CACHE)
}
