#!/usr/bin/env node
/**
 * Corrige a data de nascimento dos dizimistas cujo ano ficou registrado como 1999 — usado como
 * "ano desconhecido" em cadastros antigos. Troca o ano para 1700 (uma data impossível de
 * verdade), mantendo o dia e o mês exatamente como estão cadastrados, para sinalizar claramente
 * que o ano não é real sem perder o dia/mês (que é o que o login e os aniversariantes usam).
 *
 * Exemplo: dataNascimento "1999-03-12" (12/03/1999) vira "1700-03-12" (12/03/1700).
 *
 * Não mexe em `diaMesNascimento` (só tem dia/mês, sem ano — continua válido) nem em
 * `dataNascimento` de cônjuge/filhos (campos legados, fora do escopo deste ajuste).
 *
 * Uso:
 *   node scripts/corrigir-ano-nascimento-1999.mjs --dry-run   (mostra o que mudaria, sem gravar)
 *   node scripts/corrigir-ano-nascimento-1999.mjs             (aplica de verdade)
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
    // Guardas contra paginação infinita: página vazia, ou token repetido pela API.
    const proximo = pagina.length > 0 ? corpo.nextPageToken || '' : ''
    pageToken = proximo && !tokensVistos.has(proximo) ? proximo : ''
    if (proximo) tokensVistos.add(proximo)
  } while (pageToken)

  return documentos
}

async function atualizarDocumento(caminho, campos) {
  const url = new URL(`${BASE_URL}/${caminho}`)
  Object.keys(campos).forEach((campo) => url.searchParams.append('updateMask.fieldPaths', campo))

  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encodeFields(campos) }),
  })

  if (!res.ok) throw new Error(`Falha ao atualizar ${caminho}: ${res.status} ${await res.text()}`)
}

// ---------------------------------------------------------------- correção

/** "1999-mm-dd" -> "1700-mm-dd". Devolve null se a data não for de 1999 (nada a corrigir). */
function novaDataNascimento(dataAtual) {
  const m = typeof dataAtual === 'string' && dataAtual.match(/^1999-(\d{2}-\d{2})$/)
  return m ? `1700-${m[1]}` : null
}

// -------------------------------------------------------------------- main

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log(`\nProjeto Firebase : ${PROJECT_ID}`)
  console.log(`Modo             : ${dryRun ? 'DRY-RUN (nada será gravado)' : 'GRAVAR'}`)

  const dizimistas = await listarColecao('dizimistas')
  console.log(`\n--- Dizimistas (${dizimistas.length}) ---`)

  let corrigidos = 0
  let semMudanca = 0

  for (const { id, dados } of dizimistas) {
    const novaData = novaDataNascimento(dados.dataNascimento)
    if (!novaData) {
      semMudanca++
      continue
    }

    console.log(`  ${id.padEnd(8)} ${dados.nomeCompleto ?? ''} — dataNascimento: ${dados.dataNascimento} → ${novaData}`)
    if (!dryRun) await atualizarDocumento(`dizimistas/${encodeURIComponent(id)}`, { dataNascimento: novaData })
    corrigidos++
  }

  console.log('\n--- Resumo ---')
  console.log(`  Corrigidos (ano 1999 → 1700): ${corrigidos}`)
  console.log(`  Sem ano 1999 (não mexidos)  : ${semMudanca}`)
  console.log(dryRun ? '\nDry-run concluído — nada foi gravado.\n' : '\nCorreção concluída.\n')
}

main().catch((err) => {
  console.error('\nERRO durante a correção:', err.message)
  process.exit(1)
})
