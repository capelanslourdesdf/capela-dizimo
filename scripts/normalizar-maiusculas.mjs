#!/usr/bin/env node
/**
 * Normaliza para MAIÚSCULAS os dados textuais já gravados no Firestore, deixando a base
 * uniforme com o que os formulários passaram a salvar.
 *
 * Campos normalizados:
 *   dizimistas/{carne}         nomeCompleto, responsavelRecadastramento,
 *                              endereco (logradouro, complemento, bairro, cidade, estado),
 *                              conjuge.nomeCompleto, filhos[].nomeCompleto
 *   dizimistas/{carne}/devolucoes/{id}   lancadoPor
 *   membrosPastoral/{id}       nome
 *
 * NÃO são alterados: e-mail, telefone, CEP, datas, números de carnê, observações (texto livre)
 * e demais campos de controle.
 *
 * Uso:
 *   node scripts/normalizar-maiusculas.mjs --dry-run
 *   node scripts/normalizar-maiusculas.mjs
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

/** Executa `tarefa` sobre os itens em lotes paralelos, para não fazer centenas de chamadas em fila. */
async function emLotes(itens, tamanho, tarefa) {
  const resultados = []
  for (let i = 0; i < itens.length; i += tamanho) {
    resultados.push(...(await Promise.all(itens.slice(i, i + tamanho).map(tarefa))))
  }
  return resultados
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

// ---------------------------------------------------------------- normalização

const maiusculo = (valor) => (typeof valor === 'string' ? valor.trim().toUpperCase() : valor)

/** Imprime uma linha apagando antes o indicador de progresso, que usa \r na mesma linha. */
function logLimpo(mensagem) {
  process.stdout.write(`\r${' '.repeat(40)}\r`)
  console.log(mensagem)
}

/** Devolve só os campos que realmente mudam — evita PATCH desnecessário. */
function camposAlteradosDoDizimista(dados) {
  const alterados = {}

  for (const campo of ['nomeCompleto', 'responsavelRecadastramento']) {
    const novo = maiusculo(dados[campo])
    if (typeof dados[campo] === 'string' && novo !== dados[campo]) alterados[campo] = novo
  }

  if (dados.endereco && typeof dados.endereco === 'object') {
    const endereco = { ...dados.endereco }
    let mudouEndereco = false
    for (const campo of ['logradouro', 'complemento', 'bairro', 'cidade', 'estado', 'numero']) {
      const novo = maiusculo(endereco[campo])
      if (typeof endereco[campo] === 'string' && novo !== endereco[campo]) {
        endereco[campo] = novo
        mudouEndereco = true
      }
    }
    if (mudouEndereco) alterados.endereco = endereco
  }

  if (dados.conjuge && typeof dados.conjuge === 'object') {
    const novo = maiusculo(dados.conjuge.nomeCompleto)
    if (typeof dados.conjuge.nomeCompleto === 'string' && novo !== dados.conjuge.nomeCompleto) {
      alterados.conjuge = { ...dados.conjuge, nomeCompleto: novo }
    }
  }

  if (Array.isArray(dados.filhos) && dados.filhos.length > 0) {
    let mudouFilhos = false
    const filhos = dados.filhos.map((filho) => {
      const novo = maiusculo(filho?.nomeCompleto)
      if (typeof filho?.nomeCompleto === 'string' && novo !== filho.nomeCompleto) {
        mudouFilhos = true
        return { ...filho, nomeCompleto: novo }
      }
      return filho
    })
    if (mudouFilhos) alterados.filhos = filhos
  }

  return alterados
}

function camposAlteradosSimples(dados, campos) {
  const alterados = {}
  for (const campo of campos) {
    const novo = maiusculo(dados[campo])
    if (typeof dados[campo] === 'string' && novo !== dados[campo]) alterados[campo] = novo
  }
  return alterados
}

// -------------------------------------------------------------------- main

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log(`\nProjeto Firebase : ${PROJECT_ID}`)
  console.log(`Modo             : ${dryRun ? 'DRY-RUN (nada será gravado)' : 'GRAVAR'}`)

  const resultado = { dizimistas: 0, devolucoes: 0, membros: 0, semMudanca: 0 }

  // --- dizimistas (+ subcoleção de devoluções) ---
  const dizimistas = await listarColecao('dizimistas')
  console.log(`\n--- Dizimistas (${dizimistas.length}) ---`)

  let processados = 0

  await emLotes(dizimistas, 10, async ({ id, dados }) => {
    const alterados = camposAlteradosDoDizimista(dados)

    if (Object.keys(alterados).length === 0) {
      resultado.semMudanca++
    } else {
      const resumo = Object.keys(alterados).join(', ')
      logLimpo(`  ${id.padEnd(8)} ${dados.nomeCompleto ?? ''} → ${resumo}`)
      if (!dryRun) await atualizarDocumento(`dizimistas/${encodeURIComponent(id)}`, alterados)
      resultado.dizimistas++
    }

    const devolucoes = await listarColecao(`dizimistas/${encodeURIComponent(id)}/devolucoes`)
    for (const devolucao of devolucoes) {
      const alteradosDev = camposAlteradosSimples(devolucao.dados, ['lancadoPor'])
      if (Object.keys(alteradosDev).length === 0) continue

      logLimpo(`  ${id.padEnd(8)} devolução ${devolucao.id} → ${Object.keys(alteradosDev).join(', ')}`)
      if (!dryRun) {
        await atualizarDocumento(
          `dizimistas/${encodeURIComponent(id)}/devolucoes/${encodeURIComponent(devolucao.id)}`,
          alteradosDev,
        )
      }
      resultado.devolucoes++
    }

    processados++
    // Progresso na mesma linha: sem isso o script parece travado quando nada muda.
    process.stdout.write(`\r  verificando... ${processados}/${dizimistas.length}`)
  })

  process.stdout.write(`\r  verificados: ${processados}/${dizimistas.length}          \n`)

  // --- membros da Pastoral ---
  const membros = await listarColecao('membrosPastoral')
  console.log(`\n--- Membros da Pastoral (${membros.length}) ---`)

  for (const { id, dados } of membros) {
    const alterados = camposAlteradosSimples(dados, ['nome'])
    if (Object.keys(alterados).length === 0) continue

    console.log(`  ${dados.nome} → ${alterados.nome}`)
    if (!dryRun) await atualizarDocumento(`membrosPastoral/${encodeURIComponent(id)}`, alterados)
    resultado.membros++
  }

  console.log('\n--- Resumo ---')
  console.log(`  Dizimistas atualizados : ${resultado.dizimistas}`)
  console.log(`  Devoluções atualizadas : ${resultado.devolucoes}`)
  console.log(`  Membros atualizados    : ${resultado.membros}`)
  console.log(`  Já estavam normalizados: ${resultado.semMudanca}`)

  console.log(dryRun ? '\nDry-run concluído — nada foi gravado.\n' : '\nNormalização concluída.\n')
}

main().catch((err) => {
  console.error('\nERRO durante a normalização:', err.message)
  process.exit(1)
})
