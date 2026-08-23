import { doc, getDoc, setDoc } from 'firebase/firestore'

import { db } from '@/lib/firebase'
import { MINIMO_MESES_ATIVOS_PADRAO } from '@/utils/statusDizimista'
import { comCache, invalidarCache } from '@/lib/cacheLeitura'

const REF = doc(db, 'configuracoes', 'geral')
const CHAVE_CACHE = 'config:minimo-meses-ativos'

/** Mínimo de meses com devolução, dos últimos 6, para o dizimista ser considerado ativo. Cacheado — é lido em várias telas e quase nunca muda. */
export async function obterMinimoMesesAtivos(): Promise<number> {
  return comCache(CHAVE_CACHE, async () => {
    const snap = await getDoc(REF)
    const valor = snap.exists() ? (snap.data() as { minimoMesesAtivos?: number }).minimoMesesAtivos : undefined
    return typeof valor === 'number' && Number.isInteger(valor) && valor > 0 ? valor : MINIMO_MESES_ATIVOS_PADRAO
  })
}

export async function salvarMinimoMesesAtivos(valor: number): Promise<void> {
  await setDoc(REF, { minimoMesesAtivos: valor }, { merge: true })
  invalidarCache(CHAVE_CACHE)
}
