#!/usr/bin/env node
/**
 * Migra as devoluções avulsas (sem dizimista cadastrado) da chave antiga `-x-` para a nova `000`
 * — troca feita pra `CARNE_AVULSO` (frontend/src/constants/devolucao.ts) ficar puramente numérico
 * (digitável no teclado numérico do celular, mais limpo em analytics).
 *
 * Copia cada documento de `dizimistas/-x-/devolucoes/{id}` para `dizimistas/000/devolucoes/{id}`
 * (mesmo id, mesmos campos) e só apaga o original depois de confirmar que a cópia foi gravada
 * com sucesso.
 *
 * Uso:
 *   node scripts/migrar-devolucoes-avulsas.mjs --dry-run   (mostra o que seria migrado, sem gravar)
 *   node scripts/migrar-devolucoes-avulsas.mjs             (migra de verdade)
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

async function listarColecao(caminho) {
  const res = await fetch(`${BASE_URL}/${caminho}`)
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`Falha ao listar ${caminho}: ${res.status} ${await res.text()}`)
  const corpo = await res.json()
  return (corpo.documents || []).map((doc) => ({ id: idDoDocumento(doc.name), dados: decodeFields(doc.fields || {}) }))
}

/** Cria (ou sobrescreve) um documento inteiro no caminho exato informado. */
async function definirDocumento(caminho, campos) {
  const res = await fetch(`${BASE_URL}/${caminho}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encodeFields(campos) }),
  })
  if (!res.ok) throw new Error(`Falha ao gravar ${caminho}: ${res.status} ${await res.text()}`)
}

async function excluirDocumento(caminho) {
  const res = await fetch(`${BASE_URL}/${caminho}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Falha ao excluir ${caminho}: ${res.status} ${await res.text()}`)
}

// -------------------------------------------------------------------- main

const CARNE_ANTIGO = '-x-'
const CARNE_NOVO = '000'

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log(`\nProjeto Firebase : ${PROJECT_ID}`)
  console.log(`Modo             : ${dryRun ? 'DRY-RUN (nada será gravado)' : 'MIGRAR'}`)

  const antigas = await listarColecao(`dizimistas/${encodeURIComponent(CARNE_ANTIGO)}/devolucoes`)
  console.log(`\n--- Devoluções avulsas sob "${CARNE_ANTIGO}" (${antigas.length}) ---`)

  if (antigas.length === 0) {
    console.log('\nNada a migrar.\n')
    return
  }

  let migradas = 0
  for (const { id, dados } of antigas) {
    console.log(
      `  ${id} — competência ${dados.competencia ?? '—'}, valor R$${dados.valor ?? '—'}, lançado por ${dados.lancadoPor ?? '—'}`,
    )

    if (!dryRun) {
      const destino = `dizimistas/${encodeURIComponent(CARNE_NOVO)}/devolucoes/${encodeURIComponent(id)}`
      await definirDocumento(destino, dados)
      await excluirDocumento(`dizimistas/${encodeURIComponent(CARNE_ANTIGO)}/devolucoes/${encodeURIComponent(id)}`)
    }
    migradas++
  }

  console.log('\n--- Resumo ---')
  console.log(`  Migradas de "${CARNE_ANTIGO}" para "${CARNE_NOVO}": ${migradas}`)
  console.log(dryRun ? '\nDry-run concluído — nada foi gravado.\n' : '\nMigração concluída.\n')
}

main().catch((err) => {
  console.error('\nERRO durante a migração:', err.message)
  process.exit(1)
})
