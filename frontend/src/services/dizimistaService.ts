import {
  collection,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  startAfter,
  where,
  writeBatch,
  type QueryConstraint,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { DadosCadastraisDizimista, Dizimista } from '@/types'
import { formatarNumeroCarne, isoParaDiaMes, mesDoRegistro, normalizarNumeroCarne } from '@/utils/format'
import { comCache, invalidarCache } from '@/lib/cacheLeitura'
import { registrarMudancaStatus } from '@/services/statusAgregadoService'
import type { StatusDizimista } from '@/utils/statusDizimista'

const COLECAO = 'dizimistas'

export async function buscarDizimistaPorCarne(numeroCarne: string): Promise<Dizimista | null> {
  const ref = doc(db, COLECAO, normalizarNumeroCarne(numeroCarne))
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

/**
 * Dia/mês de nascimento do registro ("dd/mm"). Os importados da planilha guardam só isso; os
 * recadastrados têm a data completa, da qual o dia/mês é derivado.
 */
export function diaMesDoRegistro(d: Dizimista): string {
  return d.diaMesNascimento?.trim() || isoParaDiaMes(d.dataNascimento ?? '')
}

/**
 * O formulário de recadastramento hoje só coleta nome, nascimento e telefone — endereço, e-mail,
 * cônjuge, filhos e responsável ficaram só em registros antigos. Por isso só entram no payload
 * (e sobrescrevem o que já existe, via merge) quando de fato vierem preenchidos; do contrário o
 * `merge: true` do Firestore preserva o que já estava salvo.
 *
 * Nascimento e telefone seguem a mesma regra: na edição pela Pastoral eles são opcionais, e
 * gravar "" apagaria o que já está na base — inclusive o `diaMesNascimento` dos registros
 * importados da planilha, que é justamente o dado com que o dizimista entra no site. Campo em
 * branco, portanto, significa "não mexer", não "limpar".
 */
function montarPayload(dados: DadosCadastraisDizimista, agora: string) {
  const payload: Record<string, unknown> = {
    nomeCompleto: dados.nomeCompleto,
    // Data de referência do dizimista no site: a partir dela é que os meses passam a ser
    // cobrados/acompanhados. Atualizada a cada recadastramento.
    atualizadoEm: agora,
  }

  if (dados.dataNascimento) {
    payload.dataNascimento = dados.dataNascimento
    // Mantido em sincronia com a data completa: é por ele que o login confere o nascimento
    // (registros importados da planilha antiga não têm o ano).
    const diaMes = isoParaDiaMes(dados.dataNascimento)
    payload.diaMesNascimento = diaMes
    payload.mesNascimento = mesDoRegistro(diaMes)
  }
  if (dados.telefone) payload.telefone = dados.telefone

  if (dados.endereco) {
    // O Firestore rejeita "undefined" em qualquer campo — complemento em branco precisa virar
    // string vazia antes de gravar.
    payload.endereco = { ...dados.endereco, complemento: dados.endereco.complemento || '' }
  }
  if (dados.email !== undefined) payload.email = dados.email?.trim() || null
  if (dados.conjuge !== undefined) payload.conjuge = dados.conjuge ?? null
  if (dados.filhos !== undefined) payload.filhos = dados.filhos
  if (dados.responsavelRecadastramento !== undefined) {
    payload.responsavelRecadastramento = dados.responsavelRecadastramento?.trim() || null
  }

  return payload
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
  const carne = normalizarNumeroCarne(numeroCarne)
  const agora = new Date().toISOString()
  const payload = montarPayload(dados, agora)
  const ref = doc(db, COLECAO, carne)

  // Dizimista recém-criado, sem nenhuma devolução ainda: pela regra de `calcularStatusDizimista`
  // (utils/statusDizimista.ts), sempre entra como Inativo — só fica Ativo depois de pelo menos 1
  // devolução dentro da janela. Grava isso direto (sem recalcular) e ajusta o agregado de contagem
  // (statusAgregadoService.ts), pra "Ativos/Inativos" na tela de Dizimistas não precisar reler o
  // histórico de devolução de todo mundo.
  const STATUS_INICIAL: StatusDizimista = 'inativo'

  if (opcoes.exigirNovo) {
    await runTransaction(db, async (tx) => {
      const existente = await tx.get(ref)
      if (existente.exists()) {
        throw new Error(`O carnê nº ${formatarNumeroCarne(carne)} acabou de ser usado por outra pessoa. Tente salvar novamente.`)
      }
      tx.set(ref, {
        ...payload,
        numeroCarne: carne,
        origem: 'recadastramento',
        recadastradoEm: agora,
        criadoEm: agora,
        status: STATUS_INICIAL,
      })
    })
    await registrarMudancaStatus(null, STATUS_INICIAL)
    invalidarCache('dizimistas')
    return
  }

  const existente = await getDoc(ref)
  const recadastradoEmAtual = (existente.data() as Dizimista | undefined)?.recadastradoEm

  await setDoc(
    ref,
    {
      ...payload,
      recadastradoEm: recadastradoEmAtual || agora,
      ...(existente.exists() ? {} : { origem: 'recadastramento', criadoEm: agora, status: STATUS_INICIAL }),
    },
    { merge: true },
  )
  if (!existente.exists()) await registrarMudancaStatus(null, STATUS_INICIAL)
  invalidarCache('dizimistas')
}

/**
 * Lê a coleção inteira de dizimistas — cacheada por 60s pelo mesmo motivo da lista de devoluções:
 * várias telas (Dizimistas, Lista de devoluções) leem a coleção toda na mesma navegação.
 */
async function listarTodosDizimistas(): Promise<Dizimista[]> {
  return comCache('dizimistas:todos', async () => {
    const snap = await getDocs(collection(db, COLECAO))
    return snap.docs.map((d) => ({ numeroCarne: d.id, ...(d.data() as Omit<Dizimista, 'numeroCarne'>) }))
  })
}

export async function listarDizimistas(busca = ''): Promise<Dizimista[]> {
  const todos = await listarTodosDizimistas()

  const termo = busca.trim().toLowerCase()
  if (!termo) return todos

  return todos.filter(
    (d) =>
      d.nomeCompleto.toLowerCase().includes(termo) ||
      d.numeroCarne.includes(termo) ||
      formatarNumeroCarne(d.numeroCarne).includes(termo),
  )
}

/**
 * Exclui o dizimista e todo o histórico vinculado (pagamentos e devoluções),
 * já que o Firestore não apaga subcoleções automaticamente ao remover o
 * documento pai.
 */
export async function excluirDizimista(numeroCarne: string): Promise<void> {
  const carne = normalizarNumeroCarne(numeroCarne)

  const [pagamentosSnap, devolucoesSnap, dizimistaSnap] = await Promise.all([
    getDocs(collection(db, COLECAO, carne, 'pagamentos')),
    getDocs(collection(db, COLECAO, carne, 'devolucoes')),
    getDoc(doc(db, COLECAO, carne)),
  ])
  const statusAtual = (dizimistaSnap.data() as Dizimista | undefined)?.status ?? null

  const batch = writeBatch(db)
  pagamentosSnap.docs.forEach((d) => batch.delete(d.ref))
  devolucoesSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, COLECAO, carne))

  await batch.commit()
  if (statusAtual) await registrarMudancaStatus(statusAtual, null)
  invalidarCache('dizimistas')
  invalidarCache('devolucoes')
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

  // O endpoint (/api/dizimistas/cadastrar, rodando no backend) não grava `status`/`mesNascimento`
  // — só quem chama do navegador tem o `statusAgregadoService` à mão. Grava aqui em seguida, com
  // as regras dos apps this frontend, e ajusta o mesmo agregado usado no recadastramento público.
  const diaMes = isoParaDiaMes(dados.dataNascimento)
  const STATUS_INICIAL: StatusDizimista = 'inativo'
  await setDoc(
    doc(db, COLECAO, payload.numeroCarne),
    { status: STATUS_INICIAL, mesNascimento: mesDoRegistro(diaMes) },
    { merge: true },
  )
  await registrarMudancaStatus(null, STATUS_INICIAL)

  invalidarCache('dizimistas')
  return payload.numeroCarne
}

const TAMANHO_PAGINA_PADRAO = 30

export interface CursorDizimistas {
  /** Valor do campo usado para ordenar (nome ou nº do carnê, conforme o modo de busca). */
  valorOrdenacao: string
  numeroCarne: string
}

export interface PaginaDizimistas {
  itens: Dizimista[]
  /** Cursor para buscar a próxima página, ou null quando esta já é a última. */
  proximoCursor: CursorDizimistas | null
}

export interface OpcoesListarDizimistasPaginado {
  tamanhoPagina?: number
  cursor?: CursorDizimistas | null
  /** Termo de busca — nome (prefixo) se tiver alguma letra, nº do carnê (prefixo) se for só dígitos. */
  busca?: string
  status?: StatusDizimista | 'todos'
}

/**
 * Lista dizimistas paginados (30 por página, por padrão) direto do Firestore — em vez de ler a
 * coleção inteira (como `listarDizimistas`, ainda usado por outras telas que precisam de todo
 * mundo). Pensada especificamente para a tabela da tela de Dizimistas, que em escala de Paróquia
 * (milhares de registros) não pode continuar lendo tudo a cada visita só para mostrar 30 linhas.
 *
 * A busca também roda no Firestore (não mais filtrando um array já carregado no navegador): como o
 * Firestore não faz busca por "contém" nativamente, é uma busca por PREFIXO — encontra quem o nome
 * (ou o nº do carnê) COMEÇA com o termo digitado, não quem tem o termo em qualquer posição. É a
 * única forma de buscar sem reler a base inteira a cada tecla.
 *
 * Filtrar por status (Ativo/Inativo) também roda no Firestore, usando o campo `status` gravado no
 * próprio documento (ver `statusAgregadoService.ts` e `api/cron/recalcular-status.ts`) — sem ele,
 * filtrar por status exigiria reler o histórico de devolução de todo mundo.
 */
export async function listarDizimistasPaginado(opcoes: OpcoesListarDizimistasPaginado = {}): Promise<PaginaDizimistas> {
  const tamanhoPagina = opcoes.tamanhoPagina ?? TAMANHO_PAGINA_PADRAO
  const termo = opcoes.busca?.trim() ?? ''
  const buscaPorCarne = termo !== '' && /^\d+$/.test(termo)

  const restricoes: QueryConstraint[] = []

  if (opcoes.status && opcoes.status !== 'todos') {
    restricoes.push(where('status', '==', opcoes.status))
  }

  if (buscaPorCarne) {
    const carneTermo = normalizarNumeroCarne(termo)
    restricoes.push(orderBy(documentId()))
    restricoes.push(where(documentId(), '>=', doc(db, COLECAO, carneTermo)))
    restricoes.push(where(documentId(), '<', doc(db, COLECAO, carneTermo + '')))
    if (opcoes.cursor) restricoes.push(startAfter(opcoes.cursor.numeroCarne))
  } else {
    restricoes.push(orderBy('nomeCompleto'))
    restricoes.push(orderBy(documentId()))
    if (termo) {
      const termoBusca = termo.toUpperCase()
      restricoes.push(where('nomeCompleto', '>=', termoBusca))
      restricoes.push(where('nomeCompleto', '<', termoBusca + ''))
    }
    if (opcoes.cursor) {
      restricoes.push(startAfter(opcoes.cursor.valorOrdenacao, opcoes.cursor.numeroCarne))
    }
  }

  restricoes.push(limit(tamanhoPagina))

  const snap = await getDocs(query(collection(db, COLECAO), ...restricoes))
  const itens = snap.docs.map((d) => ({ numeroCarne: d.id, ...(d.data() as Omit<Dizimista, 'numeroCarne'>) }))

  const ultimo = snap.docs.at(-1)
  const proximoCursor: CursorDizimistas | null =
    ultimo && itens.length === tamanhoPagina
      ? { valorOrdenacao: buscaPorCarne ? ultimo.id : (ultimo.data().nomeCompleto as string), numeroCarne: ultimo.id }
      : null

  return { itens, proximoCursor }
}

/** Total de dizimistas cadastrados — via agregação do próprio Firestore (`count()`), que conta sem ler cada documento. Bem mais barato que `listarDizimistas().length`. */
export async function contarDizimistas(): Promise<number> {
  return comCache('dizimistas:contagem', async () => {
    const snap = await getCountFromServer(collection(db, COLECAO))
    return snap.data().count
  })
}

/** Números de carnê de todos os dizimistas Ativos — usado só para exportar (ação explícita da Pastoral), não no carregamento normal da tela. */
export async function listarNumerosCarneAtivos(): Promise<string[]> {
  const snap = await getDocs(query(collection(db, COLECAO), where('status', '==', 'ativo')))
  return snap.docs.map((d) => d.id)
}

/**
 * Dizimistas que fazem aniversário no mês informado (1-12) — filtro direto no Firestore pelo campo
 * `mesNascimento`, em vez de ler a coleção inteira e filtrar no navegador. Sem `orderBy` de
 * propósito: evita exigir um índice composto para uma lista que já é pequena (só quem nasce
 * naquele mês) e cacheado — quem chama ordena pelo dia depois, em memória.
 */
export async function listarAniversariantesDoMes(mes: number): Promise<Dizimista[]> {
  return comCache(`dizimistas:aniversariantes:${mes}`, async () => {
    const snap = await getDocs(query(collection(db, COLECAO), where('mesNascimento', '==', mes)))
    return snap.docs.map((d) => ({ numeroCarne: d.id, ...(d.data() as Omit<Dizimista, 'numeroCarne'>) }))
  })
}
