#!/usr/bin/env node
/**
 * Importa devoluções de JAN/FEV/MAR de 2026 a partir da planilha "CONTROLE DEVOLUCAO" (.csv),
 * gravando um documento em `dizimistas/{numeroCarne}/devolucoes` para cada mês em que o dizimista
 * tem um valor em reais lançado na planilha.
 *
 * Formato esperado do .csv (exportado do Excel, separador ";"): uma linha de título, uma linha de
 * cabeçalho ("NUMERO;NOME;JAN;FEV;MAR;ABR;..."), e uma linha por dizimista. Cada célula de mês traz
 * "R$ 123,45", "X" (não pago) ou vazio (sem lançamento).
 *
 * Só ABR em diante mistura valores reais com "X" sem controle confiável — por isso o script nem
 * lê essas colunas: só olha JAN, FEV e MAR, ano fixo em 2026.
 *
 * Uma segunda seção "CARNÊ SOLIDÁRIO" pode existir mais abaixo na planilha, reaproveitando números
 * que já pertencem a OUTRAS pessoas na lista principal — por segurança, essa seção é ignorada por
 * padrão (fica só no relatório) para não creditar a devolução errada a um dizimista.
 *
 * Uso:
 *   node scripts/importar-devolucoes.mjs "planilha.csv" --dry-run
 *   node scripts/importar-devolucoes.mjs "planilha.csv"
 *
 * Flags:
 *   --dry-run                     Só mostra o que seria gravado, sem gravar nada.
 *   --incluir-carne-solidario     Também processa a seção "CARNÊ SOLIDÁRIO" (não recomendado: os
 *                                 números colidem com dizimistas diferentes na lista principal).
 *
 * Requer FIREBASE_PROJECT_ID no .env da raiz (ou no ambiente).
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline'

const ANO = '2026'
const MESES_ALVO = ['JAN', 'FEV', 'MAR']
const COMPETENCIA_DO_MES = { JAN: `${ANO}-01`, FEV: `${ANO}-02`, MAR: `${ANO}-03` }

// Rótulo genérico: a planilha de controle não registra a forma de pagamento de cada lançamento.
const FORMA_PAGAMENTO_IMPORTADO = '-X-'
const LANCADO_POR_IMPORTADO = 'IMPORTAÇÃO — CONTROLE DE DEVOLUÇÃO (PLANILHA)'
const OBSERVACAO_IMPORTADO = 'Importado do controle de devoluções em planilha (carnê físico).'

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

function decodeValue(value) {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('nullValue' in value) return null
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {})
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue)
  return null
}

function decodeFields(fields) {
  const out = {}
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v)
  return out
}

function decodeDocumentId(name) {
  if (!name) return ''
  const partes = name.split('/')
  return partes[partes.length - 1] || ''
}

async function buscarDizimista(numeroCarne) {
  const res = await fetch(`${BASE_URL}/dizimistas/${encodeURIComponent(numeroCarne)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Falha ao consultar dizimista ${numeroCarne}: ${res.status} ${await res.text()}`)
  const doc = await res.json()
  return decodeFields(doc.fields || {})
}

async function listarDevolucoesExistentes(numeroCarne) {
  const res = await fetch(`${BASE_URL}/dizimistas/${encodeURIComponent(numeroCarne)}/devolucoes`)
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`Falha ao listar devoluções de ${numeroCarne}: ${res.status} ${await res.text()}`)
  const json = await res.json()
  return (json.documents || []).map((doc) => ({ id: decodeDocumentId(doc.name), ...decodeFields(doc.fields || {}) }))
}

async function criarDevolucao(numeroCarne, dados) {
  const res = await fetch(`${BASE_URL}/dizimistas/${encodeURIComponent(numeroCarne)}/devolucoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encodeFields(dados) }),
  })
  if (!res.ok) throw new Error(`Falha ao criar devolução em ${numeroCarne}: ${res.status} ${await res.text()}`)
}

// -------------------------------------------------------------------- texto

function normalizarNome(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function palavrasDoNome(texto) {
  return normalizarNome(texto).split(' ').filter(Boolean)
}

/** Sobreposição simples de palavras entre dois nomes (0 a 1) — só para detectar trocas grosseiras. */
function similaridadeNomes(a, b) {
  const pa = palavrasDoNome(a)
  const pb = palavrasDoNome(b)
  if (pa.length === 0 || pb.length === 0) return 0
  const setB = new Set(pb)
  const comuns = pa.filter((p) => setB.has(p)).length
  return comuns / Math.max(pa.length, pb.length)
}

const LIMIAR_SIMILARIDADE_NOME = 0.34

/**
 * Interpreta uma célula de mês. Devolve `null` quando não há nada a lançar (vazio ou "X"),
 * `{ erro }` quando o conteúdo não é reconhecido, ou `{ valor }` com o valor em reais.
 */
function interpretarCelulaValor(bruto) {
  const texto = String(bruto ?? '').trim()
  if (!texto) return null
  if (/^x$/i.test(texto)) return null

  const match = texto.match(/^R\$\s*([\d.,]+)\s*$/i)
  if (!match) return { erro: true, bruto: texto }

  const numero = Number(match[1].replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(numero) || numero <= 0) return { erro: true, bruto: texto }

  return { valor: numero }
}

const ABREVIACOES_MES = {
  JAN: 'JAN',
  FEV: 'FEV',
  MAR: 'MAR',
  ABR: 'ABR',
  MAI: 'MAI',
  JUN: 'JUN',
  JUL: 'JUL',
  AGO: 'AGO',
  SET: 'SET',
  OUT: 'OUT',
  NOV: 'NOV',
  DEZ: 'DEZ',
}

/** Lê o cabeçalho ("NUMERO;NOME;JAN;FEV;MAR;...") e devolve o índice de cada mês-alvo. */
function indexarColunasDeMes(celulasHeader) {
  const indices = {}
  celulasHeader.forEach((celula, i) => {
    const chave = normalizarNome(celula).slice(0, 3)
    if (ABREVIACOES_MES[chave] && MESES_ALVO.includes(chave) && indices[chave] === undefined) {
      indices[chave] = i
    }
  })
  return indices
}

function ehLinhaDeCabecalho(celulas) {
  return normalizarNome(celulas[0] ?? '') === 'NUMERO' && normalizarNome(celulas[1] ?? '') === 'NOME'
}

/** Linha "título de seção": só a 1ª célula tem texto, sem número e sem nenhum valor de mês. */
function tituloDeSecao(celulas) {
  const primeira = (celulas[0] ?? '').trim()
  const segunda = (celulas[1] ?? '').trim()
  if (!primeira || segunda || /^\d+$/.test(primeira)) return null
  const restante = celulas.slice(2).join('').trim()
  if (restante) return null
  return primeira.trim()
}

// -------------------------------------------------------------------- main

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const incluirSolidario = args.includes('--incluir-carne-solidario')
  const arquivo = args.find((a) => !a.startsWith('--'))

  if (!arquivo) {
    console.error('Uso: node scripts/importar-devolucoes.mjs <planilha.csv> [--dry-run] [--incluir-carne-solidario]')
    process.exit(1)
  }
  if (!fs.existsSync(arquivo)) {
    console.error(`ERRO: arquivo não encontrado: ${arquivo}`)
    process.exit(1)
  }

  console.log(`\nProjeto Firebase : ${PROJECT_ID}`)
  console.log(`Planilha         : ${arquivo}`)
  console.log(`Competências     : ${MESES_ALVO.map((m) => COMPETENCIA_DO_MES[m]).join(', ')}`)
  console.log(`Modo             : ${dryRun ? 'DRY-RUN (nada será gravado)' : 'GRAVAR'}`)
  console.log(`Carnê solidário  : ${incluirSolidario ? 'incluído' : 'ignorado (padrão)'}\n`)

  // --- Fase 1: extrai as linhas úteis do .csv, uma leitura em streaming (o arquivo tem ~1M linhas
  // por causa de células em branco arrastadas pelo Excel, mas só as ~180 primeiras têm dado real).
  const linhasBrutas = fs.createReadStream(arquivo)
  const rl = readline.createInterface({ input: linhasBrutas, crlfDelay: Infinity })

  let numeroLinha = 0
  let colunas = null // índices JAN/FEV/MAR na seção atual
  let secaoAtual = 'PRINCIPAL'
  const registros = [] // { secao, linha, numero, nome, valores: { JAN, FEV, MAR } }
  const secoesEncontradas = new Set(['PRINCIPAL'])

  for await (let linha of rl) {
    numeroLinha++
    if (numeroLinha === 1 && linha.charCodeAt(0) === 0xfeff) linha = linha.slice(1)

    const celulas = linha.split(';')
    if (celulas.every((c) => c.trim() === '')) continue

    if (ehLinhaDeCabecalho(celulas)) {
      colunas = indexarColunasDeMes(celulas)
      continue
    }

    const titulo = tituloDeSecao(celulas)
    if (titulo) {
      // A primeiríssima linha do arquivo é o título geral da planilha, não uma nova seção.
      if (numeroLinha > 1) {
        secaoAtual = titulo.toUpperCase().includes('SOLID') ? 'CARNE_SOLIDARIO' : titulo
        secoesEncontradas.add(secaoAtual)
      }
      continue
    }

    const numero = (celulas[0] ?? '').trim()
    const nome = (celulas[1] ?? '').trim()
    if (!nome || normalizarNome(nome) === 'TOTAL') continue
    if (!colunas) continue // ainda não vimos um cabeçalho nesta seção — não sabemos as colunas

    registros.push({
      secao: secaoAtual,
      linha: numeroLinha,
      numero,
      nome,
      valores: {
        JAN: colunas.JAN !== undefined ? celulas[colunas.JAN] : '',
        FEV: colunas.FEV !== undefined ? celulas[colunas.FEV] : '',
        MAR: colunas.MAR !== undefined ? celulas[colunas.MAR] : '',
      },
    })
  }

  console.log(`Linhas de dados lidas: ${registros.length} (seções encontradas: ${[...secoesEncontradas].join(', ')})\n`)

  // --- Fase 2: separa a seção principal da(s) extra(s), e detecta números duplicados.
  const principais = registros.filter((r) => r.secao === 'PRINCIPAL')
  const extras = registros.filter((r) => r.secao !== 'PRINCIPAL')

  if (extras.length > 0 && !incluirSolidario) {
    console.log(`⚠ Ignorando ${extras.length} linha(s) fora da seção principal (ex.: "carnê solidário"):`)
    for (const r of extras) console.log(`   linha ${r.linha}: nº ${r.numero || '(sem número)'} — ${r.nome}`)
    console.log('   Rode com --incluir-carne-solidario se quiser processá-las mesmo assim.\n')
  }

  const processar = incluirSolidario ? registros : principais

  const numerosRepetidos = new Map()
  for (const r of processar) {
    if (!r.numero) continue
    numerosRepetidos.set(r.numero, (numerosRepetidos.get(r.numero) || 0) + 1)
  }
  const numerosConflitantes = new Set([...numerosRepetidos].filter(([, n]) => n > 1).map(([numero]) => numero))

  if (numerosConflitantes.size > 0) {
    console.log(`⚠ Nº de carnê repetido para pessoas diferentes na planilha (será IGNORADO): ${[...numerosConflitantes].join(', ')}`)
    for (const r of processar) {
      if (numerosConflitantes.has(r.numero)) console.log(`   linha ${r.linha}: nº ${r.numero} — ${r.nome}`)
    }
    console.log('   Corrija o número na planilha (ou na base) e rode o script de novo para essas pessoas.\n')
  }

  // --- Fase 3: para cada linha válida, confere no Firestore e grava (ou simula) a devolução.
  const relatorio = { criadas: 0, jaExistiam: 0, orfas: [], divergencias: [], erroCelula: [], semNumero: [] }
  let valorTotal = 0

  for (const r of processar) {
    if (numerosConflitantes.has(r.numero)) continue

    if (!/^\d+$/.test(r.numero)) {
      relatorio.semNumero.push(r)
      continue
    }

    const lancamentos = []
    for (const mes of MESES_ALVO) {
      const interpretado = interpretarCelulaValor(r.valores[mes])
      if (!interpretado) continue
      if (interpretado.erro) {
        relatorio.erroCelula.push({ ...r, mes, bruto: interpretado.bruto })
        continue
      }
      lancamentos.push({ mes, valor: interpretado.valor })
    }
    if (lancamentos.length === 0) continue

    const dizimista = await buscarDizimista(r.numero)
    if (!dizimista) {
      relatorio.orfas.push(r)
      continue
    }

    const similaridade = similaridadeNomes(r.nome, dizimista.nomeCompleto || '')
    if (similaridade < LIMIAR_SIMILARIDADE_NOME) {
      relatorio.divergencias.push({ ...r, nomeNoSite: dizimista.nomeCompleto })
      continue
    }

    const existentes = await listarDevolucoesExistentes(r.numero)
    const competenciasExistentes = new Set(existentes.map((d) => d.competencia))

    for (const { mes, valor } of lancamentos) {
      const competencia = COMPETENCIA_DO_MES[mes]
      if (competenciasExistentes.has(competencia)) {
        relatorio.jaExistiam++
        continue
      }

      valorTotal += valor
      relatorio.criadas++

      if (dryRun) {
        console.log(`[dry-run] nº ${r.numero} (${r.nome}) — ${competencia}: R$ ${valor.toFixed(2)}`)
        continue
      }

      await criarDevolucao(r.numero, {
        valor,
        formaPagamento: FORMA_PAGAMENTO_IMPORTADO,
        competencia,
        lancadoPor: LANCADO_POR_IMPORTADO,
        observacao: OBSERVACAO_IMPORTADO,
        criadoEm: new Date().toISOString(),
      })
      console.log(`✓ nº ${r.numero} (${r.nome}) — ${competencia}: R$ ${valor.toFixed(2)}`)
    }
  }

  // --- Relatório final ---
  console.log('\n----------------------------------------------------------------')
  console.log(`${dryRun ? 'Seriam criadas' : 'Criadas'}          : ${relatorio.criadas} (R$ ${valorTotal.toFixed(2)})`)
  console.log(`Já existiam (puladas) : ${relatorio.jaExistiam}`)
  console.log(`Carnê não cadastrado no site : ${relatorio.orfas.length}`)
  if (relatorio.orfas.length > 0) {
    for (const r of relatorio.orfas) console.log(`   linha ${r.linha}: nº ${r.numero} — ${r.nome}`)
  }
  console.log(`Nome muito diferente do cadastro (ignoradas) : ${relatorio.divergencias.length}`)
  if (relatorio.divergencias.length > 0) {
    for (const r of relatorio.divergencias) {
      console.log(`   linha ${r.linha}: nº ${r.numero} — planilha "${r.nome}" vs. site "${r.nomeNoSite}"`)
    }
  }
  console.log(`Célula com conteúdo inesperado (ignoradas) : ${relatorio.erroCelula.length}`)
  if (relatorio.erroCelula.length > 0) {
    for (const r of relatorio.erroCelula) console.log(`   linha ${r.linha}: nº ${r.numero} (${r.mes}) — "${r.bruto}"`)
  }
  if (relatorio.semNumero.length > 0) {
    console.log(`Linha sem número de carnê válido (ignoradas) : ${relatorio.semNumero.length}`)
    for (const r of relatorio.semNumero) console.log(`   linha ${r.linha}: "${r.nome}"`)
  }
  console.log('----------------------------------------------------------------\n')
}

main().catch((err) => {
  console.error('\nERRO:', err.message)
  process.exit(1)
})
