import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { MembroPastoral } from '@/types'

const COLECAO = 'membrosPastoral'

export async function listarMembrosPastoral(): Promise<MembroPastoral[]> {
  const snap = await getDocs(query(collection(db, COLECAO), orderBy('nome')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MembroPastoral, 'id'>) }))
}

export async function criarMembroPastoral(nome: string): Promise<void> {
  await addDoc(collection(db, COLECAO), {
    nome: nome.trim().toUpperCase(),
    criadoEm: new Date().toISOString(),
  })
}

export async function atualizarMembroPastoral(id: string, nome: string): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), { nome: nome.trim().toUpperCase() })
}

export async function excluirMembroPastoral(id: string): Promise<void> {
  await deleteDoc(doc(db, COLECAO, id))
}
