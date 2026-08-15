import { addDoc, collection, getDocs, orderBy, query } from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { Devolucao, FormaPagamentoDevolucao } from '@/types'

export async function listarDevolucoes(numeroCarne: string): Promise<Devolucao[]> {
  const ref = collection(db, 'dizimistas', numeroCarne, 'devolucoes')
  const snap = await getDocs(query(ref, orderBy('criadoEm', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Devolucao, 'id'>) }))
}

export interface DadosDevolucao {
  valor: number
  formaPagamento: FormaPagamentoDevolucao
  data: string
  observacao?: string
}

export async function lancarDevolucao(numeroCarne: string, dados: DadosDevolucao): Promise<void> {
  const ref = collection(db, 'dizimistas', numeroCarne, 'devolucoes')
  await addDoc(ref, {
    ...dados,
    observacao: dados.observacao?.trim() || null,
    criadoEm: new Date().toISOString(),
  })
}
