import { collection, doc, getDoc, getDocs, runTransaction, setDoc, writeBatch } from 'firebase/firestore'

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

const NUMERO_CARNE_INICIAL = 1000

/**
 * Gera o próximo nº de carnê livre para quem não sabe o próprio número: sempre com 4 dígitos,
 * a partir de 1000. Parte do contador mantido pela importação/cadastro admin e avança até achar
 * um número que ainda não exista na base.
 */
export async function gerarNumeroCarneDisponivel(): Promise<string> {
  const contador = await getDoc(doc(db, 'contadores', 'proximoNumeroCarne'))
  const valorContador = contador.exists() ? Number((contador.data() as { valor?: number }).valor) : NaN

  let candidato =
    Number.isInteger(valorContador) && valorContador >= NUMERO_CARNE_INICIAL ? valorContador : NUMERO_CARNE_INICIAL

  for (let tentativa = 0; tentativa < 100; tentativa++) {
    const existente = await getDoc(doc(db, COLECAO, String(candidato)))
    if (!existente.exists()) return String(candidato)
    candidato++
  }

  throw new Error('Não foi possível gerar um número de carnê disponível. Procure a Pastoral do Dízimo.')
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
    responsavelRecadastramento: dados.responsavelRecadastramento?.trim() || null,
    // Data de referência do dizimista no site: a partir dela é que os meses passam a ser
    // cobrados/acompanhados. Atualizada a cada recadastramento.
    recadastradoEm: agora,
    atualizadoEm: agora,
  }
}

/**
 * Recadastramento: cria o documento se ainda não existir (migração do carnê físico para o
 * digital) ou atualiza os dados cadastrais se já existir. O nº do carnê é sempre informado por
 * quem preenche o formulário (não é gerado aqui — geração automática só ocorre no cadastro feito
 * pelo admin, em /api/dizimistas/cadastrar).
 *
 * `exigirNovo` é usado quando o número foi gerado pelo próprio site ("não sei meu carnê"): nesse
 * caso a gravação roda em transação e falha se o número tiver sido ocupado nesse meio-tempo, em
 * vez de mesclar os dados por cima de outro dizimista.
 */
export async function salvarRecadastramento(
  numeroCarne: string,
  dados: DadosCadastraisDizimista,
  opcoes: { exigirNovo?: boolean } = {},
): Promise<void> {
  const carne = numeroCarne.trim()
  const agora = new Date().toISOString()
  const payload = montarPayload(dados, agora)
  const ref = doc(db, COLECAO, carne)

  if (opcoes.exigirNovo) {
    await runTransaction(db, async (tx) => {
      const existente = await tx.get(ref)
      if (existente.exists()) {
        throw new Error(`O carnê nº ${carne} acabou de ser usado por outra pessoa. Tente salvar novamente.`)
      }
      tx.set(ref, { ...payload, numeroCarne: carne, origem: 'recadastramento', criadoEm: agora })
    })
    return
  }

  const existente = await getDoc(ref)

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
