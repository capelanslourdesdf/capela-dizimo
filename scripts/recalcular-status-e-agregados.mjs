#!/usr/bin/env node
/**
 * Recalcula, para TODOS os dizimistas, os campos `status` (Ativo/Inativo) e `mesNascimento`, e
 * reconstrói do zero os agregados `agregados/statusDizimistas` (contagem de Ativos/Inativos) e
 * `agregados/totaisDevolucaoPorAno` (agora incluindo `totaisPorMes`, usado no gráfico de evolução
 * mensal da tela de Dizimistas).
 *
 * É o mesmo cálculo que passou a rodar 1x por dia, sozinho, via
 * `api/cron/recalcular-status.ts` (pega quem muda de Ativo pra Inativo só pela passagem do tempo,
 * sem nenhuma gravação) — e é chamado a cada devolução lançada/editada/excluída via
 * `recomputarStatusAposDevolucao` (frontend/src/services/devolucaoService.ts). Este script só
 * estabelece o ponto de partida pra quem já tinha dizimistas/devoluções cadastrados antes dessa
 * mudança existir — sem ele, a tela de Dizimistas mostraria "0 Ativos, 0 Inativos" e o gráfico de
 * evolução mensal zerado até o próximo lançamento/exclusão de cada um.
 *
 * Uso:
 *   node scripts/recalcular-status-e-agregados.mjs --dry-run   (mostra o que mudaria, sem gravar)
 *   node scripts/recalcular-status-e-agregados.mjs             (grava de verdade)
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

async function getDocumento(caminho) {
  const res = await fetch(`${BASE_URL}/${caminho}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Falha ao ler ${caminho}: ${res.status} ${await res.text()}`)
  const doc = await res.json()
  return decodeFields(doc.fields || {})
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

async function atualizarCampos(caminho, campos) {
  const url = new URL(`${BASE_URL}/${caminho}`)
  Object.keys(campos).forEach((f) => url.searchParams.append('updateMask.fieldPaths', f))
  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encodeFields(campos) }),
  })
  if (!res.ok) throw new Error(`Falha ao atualizar ${caminho}: ${res.status} ${await res.text()}`)
}

// ------------------------------------------------------------------- lógica
// Mesmas regras de frontend/src/utils/statusDizimista.ts e frontend/src/utils/format.ts —
// reimplementadas aqui em JS puro porque o script roda fora do bundle do Vite (sem alias `@/`).

const JANELA_MESES_STATUS = 6
const MINIMO_MESES_ATIVOS_PADRAO = 3

function competenciaAtual() {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

function subtrairMeses(competencia, meses) {
  const [ano, mes] = competencia.split('-').map(Number)
  const data = new Date(ano, mes - 1 - meses, 1)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
}

function competenciasEntre(inicio, fim) {
  if (!/^\d{4}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}$/.test(fim) || inicio > fim) return []
  const competencias = []
  let [ano, mes] = inicio.split('-').map(Number)
  for (let i = 0; i < 600; i++) {
    const atual = `${ano}-${String(mes).padStart(2, '0')}`
    competencias.push(atual)
    if (atual === fim) break
    mes++
    if (mes > 12) {
      mes = 1
      ano++
    }
  }
  return competencias
}

function competenciaDeRegistro(d) {
  if (d.recadastradoEm) return d.recadastradoEm.slice(0, 7)
  if (d.origem === 'importacao_planilha') return ''
  return (d.criadoEm || '').slice(0, 7)
}

function calcularStatusDizimista(registro, competenciasPagas, minimoMeses, competenciaReferencia) {
  if (registro && registro > competenciaReferencia) return 'ativo'
  const inicioJanela = subtrairMeses(competenciaReferencia, JANELA_MESES_STATUS - 1)
  const inicioAplicavel = registro && inicioJanela < registro ? registro : inicioJanela
  const janela = competenciasEntre(inicioAplicavel, competenciaReferencia)
  const minimoEfetivo = Math.min(minimoMeses, janela.length)
  const mesesPagos = janela.filter((c) => competenciasPagas.has(c)).length
  return mesesPagos >= minimoEfetivo ? 'ativo' : 'inativo'
}

function competenciaDaDevolucao(dados) {
  return dados.competencia || (dados.data ? dados.data.slice(0, 7) : '') || (dados.criadoEm || '').slice(0, 7)
}

function mesDoRegistro(diaMes) {
  const m = (diaMes || '').match(/^\d{2}\/(\d{2})$/)
  if (!m) return undefined
  const mes = Number(m[1])
  return mes >= 1 && mes <= 12 ? mes : undefined
}

// -------------------------------------------------------------------- main

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`\nProjeto Firebase : ${PROJECT_ID}`)
  console.log(`Modo             : ${dryRun ? 'DRY-RUN (nada será gravado)' : 'GRAVAR'}`)

  const configGeral = await getDocumento('configuracoes/geral')
  const minimoMesesAtivos =
    typeof configGeral?.minimoMesesAtivos === 'number' ? configGeral.minimoMesesAtivos : MINIMO_MESES_ATIVOS_PADRAO
  console.log(`Mínimo de meses ativos: ${minimoMesesAtivos}`)

  const dizimistas = await listarColecao('dizimistas')
  console.log(`Dizimistas encontrados: ${dizimistas.length}`)

  const referencia = competenciaAtual()
  const totaisPorAno = new Map()
  const totaisPorMes = new Map()
  let ativos = 0
  let inativos = 0
  const mudancasStatus = []
  const mudancasMes = []
  let processados = 0

  await emLotes(dizimistas, 10, async ({ id, dados }) => {
    const devolucoes = await listarColecao(`dizimistas/${encodeURIComponent(id)}/devolucoes`)
    const competenciasPagas = new Set()
    for (const { dados: dev } of devolucoes) {
      const competencia = competenciaDaDevolucao(dev)
      const valor = typeof dev.valor === 'number' ? dev.valor : 0
      if (/^\d{4}-\d{2}$/.test(competencia) && valor > 0) {
        competenciasPagas.add(competencia)
        const ano = competencia.slice(0, 4)
        totaisPorAno.set(ano, (totaisPorAno.get(ano) ?? 0) + valor)
        totaisPorMes.set(competencia, (totaisPorMes.get(competencia) ?? 0) + valor)
      }
    }

    const statusNovo = calcularStatusDizimista(competenciaDeRegistro(dados), competenciasPagas, minimoMesesAtivos, referencia)
    if (statusNovo === 'ativo') ativos++
    else inativos++
    if (dados.status !== statusNovo) mudancasStatus.push({ id, de: dados.status ?? '(nenhum)', para: statusNovo })

    const mesNovo = mesDoRegistro(dados.diaMesNascimento)
    if (dados.mesNascimento !== mesNovo) mudancasMes.push({ id, de: dados.mesNascimento ?? '(nenhum)', para: mesNovo })

    if (!dryRun && (dados.status !== statusNovo || dados.mesNascimento !== mesNovo)) {
      await atualizarCampos(`dizimistas/${encodeURIComponent(id)}`, { status: statusNovo, mesNascimento: mesNovo })
    }

    processados++
    process.stdout.write(`\r  processando... ${processados}/${dizimistas.length}`)
  })

  // "000" é o carnê reservado pra devolução avulsa — soma no total, mas não tem status/mesNascimento.
  const devolucoesAvulsas = await listarColecao('dizimistas/000/devolucoes')
  for (const { dados: dev } of devolucoesAvulsas) {
    const competencia = competenciaDaDevolucao(dev)
    const valor = typeof dev.valor === 'number' ? dev.valor : 0
    if (/^\d{4}-\d{2}$/.test(competencia) && valor > 0) {
      const ano = competencia.slice(0, 4)
      totaisPorAno.set(ano, (totaisPorAno.get(ano) ?? 0) + valor)
      totaisPorMes.set(competencia, (totaisPorMes.get(competencia) ?? 0) + valor)
    }
  }

  process.stdout.write(`\r  processados: ${processados}/${dizimistas.length}          \n`)

  console.log(`\n--- Status ---`)
  console.log(`  Ativos: ${ativos}  Inativos: ${inativos}`)
  console.log(`  Mudanças de status: ${mudancasStatus.length}`)
  mudancasStatus.slice(0, 20).forEach((m) => console.log(`    #${m.id}: ${m.de} -> ${m.para}`))
  if (mudancasStatus.length > 20) console.log(`    ... e mais ${mudancasStatus.length - 20}`)

  console.log(`\n--- Mês de nascimento ---`)
  console.log(`  Mudanças: ${mudancasMes.length}`)

  console.log(`\n--- Totais por ano ---`)
  for (const [ano, valor] of [...totaisPorAno.entries()].sort()) {
    console.log(`  ${ano}: R$ ${valor.toFixed(2)}`)
  }

  if (!dryRun) {
    await definirDocumento('agregados/statusDizimistas', { ativos, inativos })
    await definirDocumento('agregados/totaisDevolucaoPorAno', {
      totais: Object.fromEntries(totaisPorAno),
      totaisPorMes: Object.fromEntries(totaisPorMes),
    })
    console.log('\nAgregados gravados: agregados/statusDizimistas, agregados/totaisDevolucaoPorAno.')
  } else {
    console.log('\nDry-run concluído — nada foi gravado.')
  }
}

main().catch((err) => {
  console.error('\nERRO durante o recálculo:', err.message)
  process.exit(1)
})
