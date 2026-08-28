#!/usr/bin/env node
/**
 * Preenche o documento agregado `agregados/totaisDevolucaoPorAno` (soma de todas as devoluções,
 * de todos os dizimistas, agrupada por ano) a partir do histórico já existente no Firestore.
 *
 * Passo único, de uma vez só: depois disso, o agregado é mantido incrementalmente a cada
 * lançamento/edição/exclusão de devolução (ver `ajustarTotalPorAno` em
 * frontend/src/services/devolucaoService.ts) — este script só estabelece o ponto de partida
 * correto pra quem já tinha devoluções gravadas antes dessa mudança existir.
 *
 * Sem isso, a tela "Total arrecadado por ano" (Dizimistas, na área administrativa) mostraria só o
 * que for lançado dali pra frente, subestimando o total já arrecadado.
 *
 * Uso:
 *   node scripts/preencher-totais-devolucao-por-ano.mjs --dry-run   (mostra o total sem gravar)
 *   node scripts/preencher-totais-devolucao-por-ano.mjs             (grava de verdade)
 *
 * Requer FIREBASE_PROJECT_ID no .env da raiz (ou no ambiente).
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

// ------------------------------------------------------------- firestore rest

function lerProjectId() {
  if (process.env.FIREBASE_PROJECT_ID?.trim()) return process.env.FIREBASE_PROJECT_ID.trim()

  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    for (const linha of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = linha.match(/^\s*FIREBASE_PROJECT_ID\s*=\s*(.+?)\s*$/)
      if (m) return m[1].replace(/^["']|["']$/g, '')
    }
  }

  console.error('ERRO: FIREBASE_PROJECT_ID não encontrado (defina no .env da raiz ou no ambiente).')
  process.exit(1)
}

const PROJECT_ID = lerProjectId()
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID)}/databases/(default)/documents`

function encodeValue(valor) {
  if (valor === null || valor === undefined) return { nullValue: null }
  if (typeof valor === 'string') return { stringValue: valor }
  if (typeof valor === 'boolean') return { booleanValue: valor }
  if (typeof valor === 'number') {
    return Number.isInteger(valor) ? { integerValue: String(valor) } : { doubleValue: valor }
  }
  if (Array.isArray(valor)) return { arrayValue: { values: valor.map(encodeValue) } }
  if (typeof valor === 'object') return { mapValue: { fields: encodeFields(valor) } }
  throw new Error(`Tipo não suportado: ${typeof valor}`)
}

function encodeFields(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    out[k] = encodeValue(v)
  }
  return out
}

function decodeValue(valor) {
  if ('stringValue' in valor) return valor.stringValue
  if ('integerValue' in valor) return Number(valor.integerValue)
  if ('doubleValue' in valor) return valor.doubleValue
  if ('booleanValue' in valor) return valor.booleanValue
  if ('nullValue' in valor) return null
  if ('mapValue' in valor) return decodeFields(valor.mapValue.fields || {})
  if ('arrayValue' in valor) return (valor.arrayValue.values || []).map(decodeValue)
  return null
}

function decodeFields(fields) {
  const out = {}
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v)
  return out
}

function idDoDocumento(name) {
  if (!name) return ''
  const partes = name.split('/')
  return partes[partes.length - 1] || ''
}

/** Lista todos os documentos de uma coleção, seguindo a paginação da API. */
async function listarColecao(caminho) {
  const documentos = []
  const tokensVistos = new Set()
  let pageToken = ''

  do {
    const url = new URL(`${BASE_URL}/${caminho}`)
    url.searchParams.set('pageSize', '300')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url.toString())
    if (res.status === 404) return documentos
    if (!res.ok) throw new Error(`Falha ao listar ${caminho}: ${res.status} ${await res.text()}`)

    const corpo = await res.json()
    const pagina = corpo.documents || []
    for (const doc of pagina) {
      documentos.push({ id: idDoDocumento(doc.name), dados: decodeFields(doc.fields || {}) })
    }
    const proximo = pagina.length > 0 ? corpo.nextPageToken || '' : ''
    pageToken = proximo && !tokensVistos.has(proximo) ? proximo : ''
    if (proximo) tokensVistos.add(proximo)
  } while (pageToken)

  return documentos
}

async function emLotes(itens, tamanho, tarefa) {
  const resultados = []
  for (let i = 0; i < itens.length; i += tamanho) {
    resultados.push(...(await Promise.all(itens.slice(i, i + tamanho).map(tarefa))))
  }
  return resultados
}

async function definirDocumento(caminho, campos) {
  const res = await fetch(`${BASE_URL}/${caminho}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encodeFields(campos) }),
  })
  if (!res.ok) throw new Error(`Falha ao gravar ${caminho}: ${res.status} ${await res.text()}`)
}

// ------------------------------------------------------------------- lógica

/** Mesma regra de `competenciaDaDevolucao()` do app: cai pra `.data` e depois `.criadoEm`. */
function competenciaDaDevolucao(dados) {
  return dados.competencia || (dados.data ? dados.data.slice(0, 7) : '') || (dados.criadoEm || '').slice(0, 7)
}

// -------------------------------------------------------------------- main

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log(`\nProjeto Firebase : ${PROJECT_ID}`)
  console.log(`Modo             : ${dryRun ? 'DRY-RUN (nada será gravado)' : 'GRAVAR'}`)

  const dizimistas = await listarColecao('dizimistas')
  // "000" é o carnê reservado pra devolução avulsa (sem dizimista cadastrado) — não tem
  // documento próprio em `dizimistas`, mas pode ter uma subcoleção `devolucoes`.
  const carnes = [...dizimistas.map((d) => d.id), '000']
  console.log(`Carnês a verificar: ${carnes.length} (${dizimistas.length} dizimistas + avulso)`)

  const totais = new Map()
  let totalDevolucoes = 0
  let processados = 0

  await emLotes(carnes, 10, async (numeroCarne) => {
    const devolucoes = await listarColecao(`dizimistas/${encodeURIComponent(numeroCarne)}/devolucoes`)
    for (const { dados } of devolucoes) {
      const ano = competenciaDaDevolucao(dados).slice(0, 4)
      const valor = typeof dados.valor === 'number' ? dados.valor : 0
      if (!/^\d{4}$/.test(ano) || valor <= 0) continue
      totais.set(ano, (totais.get(ano) ?? 0) + valor)
      totalDevolucoes++
    }
    processados++
    process.stdout.write(`\r  lendo... ${processados}/${carnes.length}`)
  })
  process.stdout.write(`\r  lidos: ${processados}/${carnes.length}          \n`)

  const totaisOrdenados = [...totais.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))

  console.log('\n--- Totais por ano ---')
  for (const [ano, valor] of totaisOrdenados) {
    console.log(`  ${ano}: R$ ${valor.toFixed(2)}`)
  }
  console.log(`\n  Devoluções somadas: ${totalDevolucoes}`)
  console.log(`  Total geral: R$ ${[...totais.values()].reduce((s, v) => s + v, 0).toFixed(2)}`)

  if (!dryRun) {
    await definirDocumento('agregados/totaisDevolucaoPorAno', { totais: Object.fromEntries(totais) })
    console.log('\nAgregado gravado em agregados/totaisDevolucaoPorAno.')
  } else {
    console.log('\nDry-run concluído — nada foi gravado.')
  }
}

main().catch((err) => {
  console.error('\nERRO durante o preenchimento:', err.message)
  process.exit(1)
})
