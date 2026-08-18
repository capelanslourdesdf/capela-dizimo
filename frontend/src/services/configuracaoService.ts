import { doc, getDoc, setDoc } from 'firebase/firestore'

import { db } from '@/lib/firebase'
import { MESES_PARA_INATIVO_PADRAO } from '@/utils/statusDizimista'

const REF = doc(db, 'configuracoes', 'geral')

export async function obterMesesParaInativo(): Promise<number> {
  const snap = await getDoc(REF)
  const valor = snap.exists() ? (snap.data() as { mesesParaInativo?: number }).mesesParaInativo : undefined
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0 ? valor : MESES_PARA_INATIVO_PADRAO
}

export async function salvarMesesParaInativo(valor: number): Promise<void> {
  await setDoc(REF, { mesesParaInativo: valor }, { merge: true })
}
