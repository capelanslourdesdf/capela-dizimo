#!/usr/bin/env node
/**
 * Verificação somente-leitura: conta quantas devoluções (em todos os dizimistas) NÃO têm o
 * campo `competencia` preenchido. Passo 1 do plano de filtrar `listarTodasDevolucoesPorCarne()`
 * por competência no Firestore — só é seguro adicionar `where('competencia', ...)` depois de
 * confirmar que nenhum documento depende do fallback (`.data`/`.criadoEm`).
 *
 * Não grava nada. Uso:
 *   node scripts/verificar-competencia-devolucoes.mjs
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

// -------------------------------------------------------------------- main

async function main() {
  console.log(`\nProjeto Firebase: ${PROJECT_ID}`)
  console.log('Modo: somente leitura — nada será gravado.\n')

  const dizimistas = await listarColecao('dizimistas')
  console.log(`Dizimistas encontrados: ${dizimistas.length}`)

  let totalDevolucoes = 0
  let semCompetencia = 0
  const exemplos = []
  let processados = 0

  await emLotes(dizimistas, 10, async ({ id: numeroCarne }) => {
    const devolucoes = await listarColecao(`dizimistas/${encodeURIComponent(numeroCarne)}/devolucoes`)
    totalDevolucoes += devolucoes.length

    for (const { id, dados } of devolucoes) {
      const competencia = dados.competencia
      if (typeof competencia === 'string' && /^\d{4}-\d{2}$/.test(competencia)) continue

      semCompetencia++
      if (exemplos.length < 20) {
        exemplos.push({ numeroCarne, id, competencia, data: dados.data, criadoEm: dados.criadoEm })
      }
    }

    processados++
    process.stdout.write(`\r  verificando... ${processados}/${dizimistas.length}`)
  })

  process.stdout.write(`\r  verificados: ${processados}/${dizimistas.length}          \n`)

  console.log('\n--- Resultado ---')
  console.log(`  Total de devoluções            : ${totalDevolucoes}`)
  console.log(`  Sem competência válida ("aaaa-mm"): ${semCompetencia}`)

  if (semCompetencia > 0) {
    console.log('\n  Exemplos (até 20):')
    for (const ex of exemplos) {
      console.log(`    carnê ${ex.numeroCarne} / devolução ${ex.id} — competencia=${JSON.stringify(ex.competencia)} data=${JSON.stringify(ex.data)} criadoEm=${JSON.stringify(ex.criadoEm)}`)
    }
    console.log('\n  => Backfill necessário antes de filtrar por competência no Firestore.')
  } else {
    console.log('\n  => Todos os documentos têm competência válida. Seguro adicionar o filtro.')
  }
}

main().catch((err) => {
  console.error('\nERRO durante a verificação:', err.message)
  process.exit(1)
})
