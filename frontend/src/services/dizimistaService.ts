import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { DadosCadastraisDizimista, Dizimista } from '@/types'

const COLECAO = 'dizimistas'

export async function buscarDizimistaPorCarne(numeroCarne: string): Promise<Dizimista | null> {
  const ref = doc(db, COLECAO, numeroCarne.trim())
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { numeroCarne: snap.id, ...(snap.data() as Omit<Dizimista, 'numeroCarne'>) }
}

/**
 * Recadastramento: cria o documento se ainda não existir (migração do carnê físico para o
 * digital) ou atualiza os dados cadastrais se já existir. O nº do carnê é sempre informado por
 * quem preenche o formulário (não é gerado aqui — geração automática só ocorre no cadastro feito
 * pelo admin, em /api/dizimistas/cadastrar).
 */
export async function salvarRecadastramento(numeroCarne: string, dados: DadosCadastraisDizimista): Promise<void> {
  const carne = numeroCarne.trim()
  const ref = doc(db, COLECAO, carne)
  const existente = await getDoc(ref)
  const agora = new Date().toISOString()

  await setDoc(
    ref,
    {
      ...dados,
      email: dados.email?.trim() || null,
      conjuge: dados.conjuge ?? null,
      filhos: dados.filhos ?? [],
      atualizadoEm: agora,
      ...(existente.exists() ? {} : { origem: 'recadastramento', criadoEm: agora }),
    },
    { merge: true },
  )
}

export async function listarDizimistas(busca = ''): Promise<Dizimista[]> {
  const snap = await getDocs(collection(db, COLECAO))
  const todos = snap.docs.map((d) => ({ numeroCarne: d.id, ...(d.data() as Omit<Dizimista, 'numeroCarne'>) }))

  const termo = busca.trim().toLowerCase()
  if (!termo) return todos

  return todos.filter(
    (d) => d.nomeCompleto.toLowerCase().includes(termo) || d.numeroCarne.includes(termo),
  )
}

/**
 * Exclui o dizimista e todo o histórico vinculado (pagamentos e devoluções),
 * já que o Firestore não apaga subcoleções automaticamente ao remover o
 * documento pai.
 */
export async function excluirDizimista(numeroCarne: string): Promise<void> {
  const carne = numeroCarne.trim()

  const [pagamentosSnap, devolucoesSnap] = await Promise.all([
    getDocs(collection(db, COLECAO, carne, 'pagamentos')),
    getDocs(collection(db, COLECAO, carne, 'devolucoes')),
  ])

  const batch = writeBatch(db)
  pagamentosSnap.docs.forEach((d) => batch.delete(d.ref))
  devolucoesSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, COLECAO, carne))

  await batch.commit()
}

export type CriarDizimistaAdminInput = DadosCadastraisDizimista

export async function criarDizimistaAdmin(dados: CriarDizimistaAdminInput, adminToken: string): Promise<string> {
  const response = await fetch('/api/dizimistas/cadastrar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(dados),
  })

  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; numeroCarne?: string; error?: string }

  if (!response.ok || !payload.ok || !payload.numeroCarne) {
    throw new Error(payload.error || 'Não foi possível cadastrar o dizimista.')
  }

  return payload.numeroCarne
}
