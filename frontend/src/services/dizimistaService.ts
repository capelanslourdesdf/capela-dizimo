import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { DadosCadastraisDizimista, Dizimista } from '@/types'
import { isoParaDiaMes } from '@/utils/format'

const COLECAO = 'dizimistas'

export async function buscarDizimistaPorCarne(numeroCarne: string): Promise<Dizimista | null> {
  const ref = doc(db, COLECAO, numeroCarne.trim())
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { numeroCarne: snap.id, ...(snap.data() as Omit<Dizimista, 'numeroCarne'>) }
}

function montarPayload(dados: DadosCadastraisDizimista, agora: string) {
  return {
    ...dados,
    // Mantido em sincronia com a data completa: é por ele que o login confere o nascimento
    // (registros importados da planilha antiga não têm o ano).
    diaMesNascimento: isoParaDiaMes(dados.dataNascimento),
    // O Firestore rejeita "undefined" em qualquer campo — campos opcionais do formulário
    // (ex.: complemento em branco) precisam virar string vazia/null antes de gravar.
    endereco: {
      ...dados.endereco,
      complemento: dados.endereco.complemento || '',
    },
    email: dados.email?.trim() || null,
    conjuge: dados.conjuge ?? null,
    filhos: dados.filhos ?? [],
    atualizadoEm: agora,
  }
}

/**
 * Recadastramento: cria o documento se ainda não existir (migração do carnê físico para o
 * digital) ou atualiza os dados cadastrais se já existir. O nº do carnê é sempre informado por
 * quem preenche o formulário (não é gerado aqui — geração automática só ocorre no cadastro feito
 * pelo admin, em /api/dizimistas/cadastrar).
 *
 * Quando `numeroCarneAnterior` é informado e difere do novo número, o cadastro é *movido*: como o
 * carnê é o ID do documento, o registro é recriado sob o novo número levando junto o histórico
 * (pagamentos e devoluções), e o documento antigo é apagado — tudo em um único batch.
 */
export async function salvarRecadastramento(
  numeroCarne: string,
  dados: DadosCadastraisDizimista,
  numeroCarneAnterior?: string,
): Promise<void> {
  const carne = numeroCarne.trim()
  const anterior = numeroCarneAnterior?.trim()
  const agora = new Date().toISOString()
  const payload = montarPayload(dados, agora)

  const ref = doc(db, COLECAO, carne)
  const existente = await getDoc(ref)

  if (anterior && anterior !== carne) {
    if (existente.exists()) {
      throw new Error(`Já existe um cadastro com o carnê nº ${carne}. Confira o número informado.`)
    }

    const refAntigo = doc(db, COLECAO, anterior)
    const antigo = await getDoc(refAntigo)

    if (antigo.exists()) {
      const [pagamentos, devolucoes] = await Promise.all([
        getDocs(collection(db, COLECAO, anterior, 'pagamentos')),
        getDocs(collection(db, COLECAO, anterior, 'devolucoes')),
      ])

      const batch = writeBatch(db)
      const dadosAntigos = antigo.data() as Partial<Dizimista>

      batch.set(ref, {
        ...dadosAntigos,
        ...payload,
        numeroCarne: carne,
        origem: dadosAntigos.origem ?? 'recadastramento',
        criadoEm: dadosAntigos.criadoEm ?? agora,
      })

      pagamentos.docs.forEach((d) => {
        batch.set(doc(db, COLECAO, carne, 'pagamentos', d.id), d.data())
        batch.delete(d.ref)
      })
      devolucoes.docs.forEach((d) => {
        batch.set(doc(db, COLECAO, carne, 'devolucoes', d.id), d.data())
        batch.delete(d.ref)
      })

      batch.delete(refAntigo)
      await batch.commit()
      return
    }
  }

  await setDoc(
    ref,
    {
      ...payload,
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

export async function criarDizimistaAdmin(dados: CriarDizimistaAdminInput): Promise<string> {
  const response = await fetch('/api/dizimistas/cadastrar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })

  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; numeroCarne?: string; error?: string }

  if (!response.ok || !payload.ok || !payload.numeroCarne) {
    throw new Error(payload.error || 'Não foi possível cadastrar o dizimista.')
  }

  return payload.numeroCarne
}
