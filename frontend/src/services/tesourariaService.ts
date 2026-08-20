import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type {
  ControleTesouraria,
  Devolucao,
  EntradaTesouraria,
  EventoTesouraria,
  FormaPagamentoDevolucao,
  SaidaTesouraria,
  StatusControleTesouraria,
} from '@/types'
import { competenciaDaDevolucao } from '@/services/devolucaoService'
import { competenciaAtual, competenciasEntre } from '@/utils/format'
import { COMPETENCIA_INICIAL_TESOURARIA } from '@/constants/tesouraria'

const COLECAO_CONTROLES = 'tesouraria'
const COLECAO_EVENTOS = 'tesourariaEventos'

/** Prefixo que identifica uma receita "dízimo" calculada a partir das devoluções — nunca é salva no documento, então nunca aparece como lançamento editável. */
const PREFIXO_RECEITA_CALCULADA = 'dizimo-devolucoes-'

const ORDEM_FORMAS_DIZIMO: FormaPagamentoDevolucao[] = ['pix', 'cartao', 'dinheiro']

export function ehReceitaCalculada(entradaId: string): boolean {
  return entradaId.startsWith(PREFIXO_RECEITA_CALCULADA)
}

/**
 * Até 3 receitas "dízimo" (uma por forma de pagamento, só quando houve algo naquela forma),
 * somando as devoluções de dízimo que a Pastoral lançou pra essa competência. Não é um lançamento
 * manual da Tesouraria — é recalculado toda vez a partir da fonte real (as devoluções), então
 * nunca sai de sincronia nem duplica se uma devolução for editada ou removida depois.
 */
export function receitasDizimoDaCompetencia(competencia: string, todasDevolucoes: Devolucao[]): EntradaTesouraria[] {
  const doMes = todasDevolucoes.filter((d) => competenciaDaDevolucao(d) === competencia)

  return ORDEM_FORMAS_DIZIMO.map((forma) => {
    const doMesNaForma = doMes.filter((d) => d.formaPagamento === forma)
    const total = doMesNaForma.reduce((soma, d) => soma + d.valor, 0)
    if (total <= 0) return null

    const entrada: EntradaTesouraria = {
      id: `${PREFIXO_RECEITA_CALCULADA}${forma}`,
      data: `${competencia}-01`,
      categoria: 'dizimo',
      valor: total,
      formaPagamento: forma,
      observacao: `Calculado a partir de ${doMesNaForma.length} devolução(ões) de dízimo lançada(s) no Administrativo.`,
    }
    return entrada
  }).filter((entrada): entrada is EntradaTesouraria => entrada !== null)
}

/** Competências ("aaaa-mm") controladas pela Tesouraria: de `COMPETENCIA_INICIAL_TESOURARIA` até o mês vigente. */
export function competenciasControleTesouraria(): string[] {
  const atual = competenciaAtual()
  const fim = atual < COMPETENCIA_INICIAL_TESOURARIA ? COMPETENCIA_INICIAL_TESOURARIA : atual
  return competenciasEntre(COMPETENCIA_INICIAL_TESOURARIA, fim)
}

function controlePadrao(competencia: string): ControleTesouraria {
  return { competencia, status: 'em_andamento', entradas: [], saidas: [], criadoEm: '', atualizadoEm: '' }
}

/**
 * Todos os meses controlados pela Tesouraria, do mais recente pro mais antigo. Meses ainda sem
 * lançamento nenhum aparecem com totais zerados (o documento só é criado de fato quando alguém
 * abre o controle) — assim o painel sempre mostra a linha do tempo completa desde
 * `COMPETENCIA_INICIAL_TESOURARIA`, mesmo sem nada lançado ainda.
 */
export async function listarControlesTesouraria(): Promise<ControleTesouraria[]> {
  const snap = await getDocs(collection(db, COLECAO_CONTROLES))
  const existentes = new Map(
    snap.docs.map((d) => [d.id, { competencia: d.id, ...(d.data() as Omit<ControleTesouraria, 'competencia'>) }]),
  )

  return competenciasControleTesouraria()
    .map((competencia) => existentes.get(competencia) ?? controlePadrao(competencia))
    .sort((a, b) => (a.competencia < b.competencia ? 1 : -1))
}

/**
 * Busca o controle do mês sem criar nada — usado pra conferir o mês anterior (variação do
 * balancete), onde um documento inexistente é uma resposta válida (mês fora do período
 * controlado, ou simplesmente ainda não aberto por ninguém), não um erro.
 */
export async function buscarControleTesouraria(competencia: string): Promise<ControleTesouraria | null> {
  const snap = await getDoc(doc(db, COLECAO_CONTROLES, competencia))
  if (!snap.exists()) return null
  return { competencia: snap.id, ...(snap.data() as Omit<ControleTesouraria, 'competencia'>) }
}

/** Busca o controle do mês; se ainda não existir, cria um vazio ("em andamento") na hora. */
export async function obterOuCriarControleTesouraria(competencia: string): Promise<ControleTesouraria> {
  const ref = doc(db, COLECAO_CONTROLES, competencia)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return { competencia: snap.id, ...(snap.data() as Omit<ControleTesouraria, 'competencia'>) }
  }

  const agora = new Date().toISOString()
  const novo: Omit<ControleTesouraria, 'competencia'> = {
    status: 'em_andamento',
    entradas: [],
    saidas: [],
    criadoEm: agora,
    atualizadoEm: agora,
  }
  await setDoc(ref, novo)
  return { competencia, ...novo }
}

/** Saldo do controle, contando também receitas calculadas (ex.: dízimo vindo das devoluções) que não estão salvas no documento. */
export function saldoDoControle(controle: ControleTesouraria, receitasExtras: EntradaTesouraria[] = []): number {
  const receitas = controle.entradas.reduce((s, e) => s + e.valor, 0) + receitasExtras.reduce((s, e) => s + e.valor, 0)
  const despesas = controle.saidas.reduce((s, sa) => s + sa.valor, 0)
  return receitas - despesas
}

export interface DadosControleTesouraria {
  status: StatusControleTesouraria
  entradas: EntradaTesouraria[]
  saidas: SaidaTesouraria[]
}

/**
 * O controle nunca pode ser excluído (só editado) — por isso aqui é sempre `updateDoc` sobre um
 * documento que já existe (garantido por `obterOuCriarControleTesouraria`, chamado ao abrir a tela).
 */
export async function salvarControleTesouraria(competencia: string, dados: DadosControleTesouraria): Promise<void> {
  const ref = doc(db, COLECAO_CONTROLES, competencia)
  await updateDoc(ref, { ...dados, atualizadoEm: new Date().toISOString() })
}

export type DadosEventoTesouraria = Omit<EventoTesouraria, 'id' | 'criadoEm' | 'atualizadoEm'>

export async function listarEventosTesouraria(ano: number): Promise<EventoTesouraria[]> {
  const snap = await getDocs(collection(db, COLECAO_EVENTOS))
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<EventoTesouraria, 'id'>) }))
    .filter((e) => e.ano === ano)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export async function criarEventoTesouraria(dados: DadosEventoTesouraria): Promise<void> {
  const agora = new Date().toISOString()
  await addDoc(collection(db, COLECAO_EVENTOS), {
    ...dados,
    observacao: dados.observacao?.trim() || null,
    criadoEm: agora,
    atualizadoEm: agora,
  })
}

export async function atualizarEventoTesouraria(id: string, dados: DadosEventoTesouraria): Promise<void> {
  await updateDoc(doc(db, COLECAO_EVENTOS, id), {
    ...dados,
    observacao: dados.observacao?.trim() || null,
    atualizadoEm: new Date().toISOString(),
  })
}

export async function excluirEventoTesouraria(id: string): Promise<void> {
  await deleteDoc(doc(db, COLECAO_EVENTOS, id))
}
