import { doc, getDoc, setDoc } from 'firebase/firestore'

import { db } from '@/lib/firebase'
import { MINIMO_MESES_ATIVOS_PADRAO } from '@/utils/statusDizimista'

const REF = doc(db, 'configuracoes', 'geral')

/** Mínimo de meses com devolução, dos últimos 6, para o dizimista ser considerado ativo. */
export async function obterMinimoMesesAtivos(): Promise<number> {
  const snap = await getDoc(REF)
  const valor = snap.exists() ? (snap.data() as { minimoMesesAtivos?: number }).minimoMesesAtivos : undefined
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0 ? valor : MINIMO_MESES_ATIVOS_PADRAO
}

export async function salvarMinimoMesesAtivos(valor: number): Promise<void> {
  await setDoc(REF, { minimoMesesAtivos: valor }, { merge: true })
}
