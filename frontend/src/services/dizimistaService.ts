import { collection, doc, getDoc, getDocs, runTransaction, setDoc, writeBatch } from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { DadosCadastraisDizimista, Dizimista } from '@/types'
import { isoParaDiaMes } from '@/utils/format'
import { similaridadeNome } from '@/utils/busca'

const COLECAO = 'dizimistas'

export async function buscarDizimistaPorCarne(numeroCarne: string): Promise<Dizimista | null> {
  const ref = doc(db, COLECAO, numeroCarne.trim())
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { numeroCarne: snap.id, ...(snap.data() as Omit<Dizimista, 'numeroCarne'>) }
}

const NUMERO_CARNE_INICIAL = 500
const NUMERO_CARNE_MAXIMO = 99999 // até 5 dígitos

/**
 * Gera o próximo nº de carnê livre para quem não sabe o próprio número: até 5 dígitos, a partir
 * de 500. Usa o mesmo contador do cadastro pelo admin (`contadores/proximoNumeroCarne`), e o
 * avança dentro de uma transação — o número é "queimado" assim que é gerado (não só quando o
 * recadastramento é salvo), garantindo que nunca se repita, mesmo entre pessoas gerando um
 * número ao mesmo tempo.
 */
export async function gerarNumeroCarneDisponivel(): Promise<string> {
  const contadorRef = doc(db, 'contadores', 'proximoNumeroCarne')

  const candidato = await runTransaction(db, async (tx) => {
    const contador = await tx.get(contadorRef)
    const valorContador = contador.exists() ? Number((contador.data() as { valor?: number }).valor) : NaN

    let numero =
      Number.isInteger(valorContador) && valorContador >= NUMERO_CARNE_INICIAL ? valorContador : NUMERO_CARNE_INICIAL

    // Pula números já em uso (ex.: carnês físicos legados que caiam nessa faixa). Todas as
    // leituras da transação precisam vir antes da escrita final do contador.
    for (let tentativa = 0; tentativa < 100; tentativa++) {
      if (numero > NUMERO_CARNE_MAXIMO) {
        throw new Error('Não foi possível gerar um número de carnê disponível. Procure a Pastoral do Dízimo.')
      }
      const existente = await tx.get(doc(db, COLECAO, String(numero)))
      if (!existente.exists()) break
      numero++
    }

    tx.set(contadorRef, { valor: numero + 1 }, { merge: true })
    return numero
  })

  return String(candidato)
}

export interface CandidatoCarne {
  dizimista: Dizimista
  pontuacaoNome: number
  nascimentoConfere: boolean
}

/**
 * Dia/mês de nascimento do registro ("dd/mm"). Os importados da planilha guardam só isso; os
 * recadastrados têm a data completa, da qual o dia/mês é derivado.
 */
function diaMesDoRegistro(d: Dizimista): string {
  return d.diaMesNascimento?.trim() || isoParaDiaMes(d.dataNascimento ?? '')
}

const PONTUACAO_MINIMA = 0.7
/** Sem casar a data, exigimos um nome bem mais parecido para sequer sugerir o registro. */
const PONTUACAO_MINIMA_SEM_DATA = 0.85

/**
 * Procura o carnê de quem não lembra o número, a partir do nome e do dia/mês de nascimento —
 * o mesmo par usado no login, e a única informação de nascimento que a planilha antiga traz.
 *
 * A comparação de nomes é aproximada (ver utils/busca), porque a base mistura digitação manual
 * com a planilha — THIAGO/TIAGO, LUIS/LUIZ e afins precisam se encontrar.
 *
 * Prioriza quem também bate a data. Se ninguém bater, ainda devolve nomes muito parecidos
 * (com `nascimentoConfere: false`), para evitar criar um carnê duplicado por causa de uma data
 * digitada errada — nesse caso a decisão fica com quem está preenchendo.
 */
export async function buscarCarnePorNomeENascimento(nome: string, diaMes: string): Promise<CandidatoCarne[]> {
  const todos = await listarDizimistas()
  const procurado = diaMes.trim()

  const avaliados = todos.map((dizimista) => ({
    dizimista,
    pontuacaoNome: similaridadeNome(nome, dizimista.nomeCompleto),
    nascimentoConfere: !!procurado && diaMesDoRegistro(dizimista) === procurado,
  }))

  const ordenar = (a: CandidatoCarne, b: CandidatoCarne) =>
    Number(b.nascimentoConfere) - Number(a.nascimentoConfere) || b.pontuacaoNome - a.pontuacaoNome

  const comData = avaliados
    .filter((c) => c.nascimentoConfere && c.pontuacaoNome >= PONTUACAO_MINIMA)
    .sort(ordenar)

  if (comData.length > 0) return comData.slice(0, 8)

  return avaliados
    .filter((c) => c.pontuacaoNome >= PONTUACAO_MINIMA_SEM_DATA)
    .sort(ordenar)
    .slice(0, 8)
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
 *
 * `recadastradoEm` marca a ENTRADA do dizimista no site e por isso só é gravado na primeira vez —
 * edições posteriores (inclusive pela Pastoral) o preservam, senão a base de cálculo dos meses
 * pendentes andaria para frente a cada alteração.
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
      tx.set(ref, {
        ...payload,
        numeroCarne: carne,
        origem: 'recadastramento',
        recadastradoEm: agora,
        criadoEm: agora,
      })
    })
    return
  }

  const existente = await getDoc(ref)
  const recadastradoEmAtual = (existente.data() as Dizimista | undefined)?.recadastradoEm

  await setDoc(
    ref,
    {
      ...payload,
      recadastradoEm: recadastradoEmAtual || agora,
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
