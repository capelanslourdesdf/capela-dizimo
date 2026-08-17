#!/usr/bin/env node
/**
 * Importa dizimistas de uma planilha .xlsx para o Firestore.
 *
 * Formato esperado (o mesmo da planilha de aniversariantes da Pastoral): a planilha é dividida
 * em blocos por mês, cada um começando com um título do tipo "ANIVERSARIANTES DO MÊS DE JANEIRO",
 * seguido de um cabeçalho e das linhas do mês:
 *
 *     ANIVERSARIANTES DO MÊS DE JANEIRO
 *     NUMERO | NOME                      | DATA NASC. | TELEFONE
 *     369    | MARIA SOARES RIBEIRO      | 1          | (61) 99119-7827
 *
 * A coluna "DATA NASC." traz apenas o DIA — o mês vem do título do bloco, e o ano não existe na
 * planilha. Por isso cada registro é gravado com `diaMesNascimento` ("dd/mm"), que é o campo
 * conferido no login. Blocos podem estar empilhados na mesma aba e/ou espalhados em várias abas;
 * o script varre todas.
 *
 * Também aceita planilhas em tabela simples (uma linha de cabeçalho no topo), com colunas extras
 * como endereço, e-mail, cônjuge e filhos, se um dia existirem.
 *
 * Uso:
 *   node scripts/importar-dizimistas.mjs planilha.xlsx --dry-run
 *   node scripts/importar-dizimistas.mjs planilha.xlsx
 *   node scripts/importar-dizimistas.mjs planilha.xlsx --sobrescrever
 *
 * Flags:
 *   --dry-run        Só mostra o que seria importado, sem gravar nada.
 *   --sobrescrever   Atualiza carnês que já existem no banco (padrão: pula).
 *   --aba "Nome"     Restringe a uma aba específica (padrão: todas).
 *
 * Requer FIREBASE_PROJECT_ID no .env da raiz (ou no ambiente).
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'

// xlsx (SheetJS) é CommonJS — o require garante o mesmo shape em qualquer versão do Node.
const XLSX = createRequire(import.meta.url)('xlsx')

/**
 * Lê .csv respeitando o encoding: arquivos exportados do Excel costumam vir em Windows-1252,
 * e não em UTF-8. Decodifica como UTF-8 e, se aparecer caractere inválido, refaz em Windows-1252.
 */
function lerCsvComoTexto(arquivo) {
  const buffer = fs.readFileSync(arquivo)

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString('utf8')
  }

  const comoUtf8 = buffer.toString('utf8')
  if (!comoUtf8.includes('�')) return comoUtf8

  return new TextDecoder('windows-1252').decode(buffer)
}

/** Abre .csv (separador ; ou ,) ou .xlsx e devolve a workbook do SheetJS. */
function abrirPlanilha(arquivo) {
  if (!/\.csv$/i.test(arquivo)) return XLSX.readFile(arquivo, { cellDates: true })

  const texto = lerCsvComoTexto(arquivo)
  const primeirasLinhas = texto.split(/\r?\n/).slice(0, 20).join('\n')
  const separador = (primeirasLinhas.match(/;/g) || []).length >= (primeirasLinhas.match(/,/g) || []).length ? ';' : ','

  return XLSX.read(texto, { type: 'string', FS: separador, raw: true })
}

const COLECAO = 'dizimistas'
const MAX_FILHOS = 4
const NUMERO_CARNE_INICIAL = 500

// ---------------------------------------------------------------- utilidades

function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const MESES = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
}

/** Detecta "ANIVERSARIANTES DO MÊS DE JANEIRO" (ou só "JANEIRO") e devolve o nº do mês. */
function detectarMes(linhaCells) {
  const texto = normalizar(linhaCells.join(' '))
  if (!texto) return null
  for (const [nome, numero] of Object.entries(MESES)) {
    if (new RegExp(`\\b${nome}\\b`).test(texto)) return numero
  }
  return null
}

/** Aliases aceitos para cada campo (comparados sobre o cabeçalho normalizado). */
const ALIASES = {
  numeroCarne: ['numero', 'carne', 'numero carne', 'numero do carne', 'n carne', 'no carne', 'codigo', 'cod'],
  nomeCompleto: ['nome', 'nome completo', 'dizimista', 'nome do dizimista'],
  dataNascimento: ['data nasc', 'data nascimento', 'data de nascimento', 'nascimento', 'dt nascimento', 'dia'],
  telefone: ['telefone', 'celular', 'whatsapp', 'fone', 'contato', 'tel'],
  email: ['email', 'e mail'],
  cep: ['cep'],
  logradouro: ['endereco', 'logradouro', 'rua', 'endereco completo'],
  numeroCasa: ['numero casa', 'num', 'n'],
  complemento: ['complemento', 'compl'],
  bairro: ['bairro'],
  cidade: ['cidade', 'municipio'],
  estado: ['estado', 'uf'],
  conjugeNome: ['conjuge', 'nome conjuge', 'conjuge nome', 'esposa', 'esposo', 'nome do conjuge'],
  conjugeDataNascimento: ['conjuge nascimento', 'nascimento conjuge', 'data nascimento conjuge'],
}

function aliasesFilho(indice) {
  const n = indice + 1
  return {
    nome: [`filho ${n}`, `filho${n}`, `filho ${n} nome`, `nome filho ${n}`, `filha ${n}`, `nome filha ${n}`],
    nascimento: [`filho ${n} nascimento`, `nascimento filho ${n}`, `filho ${n} data nascimento`],
  }
}

/**
 * Tenta interpretar a linha como cabeçalho. Devolve { campo: índiceDaColuna } se reconhecer
 * pelo menos o nº do carnê e o nome; caso contrário devolve null.
 */
function tentarCabecalho(linhaCells) {
  const porIndice = linhaCells.map((c) => normalizar(c))
  const mapa = { filhos: [] }

  for (const [campo, aliases] of Object.entries(ALIASES)) {
    const idx = porIndice.findIndex((c) => c && aliases.includes(c))
    if (idx >= 0) mapa[campo] = idx
  }

  for (let i = 0; i < MAX_FILHOS; i++) {
    const { nome, nascimento } = aliasesFilho(i)
    const idxNome = porIndice.findIndex((c) => c && nome.includes(c))
    if (idxNome < 0) continue
    const idxNasc = porIndice.findIndex((c) => c && nascimento.includes(c))
    mapa.filhos.push({ nome: idxNome, nascimento: idxNasc >= 0 ? idxNasc : null })
  }

  if (mapa.numeroCarne === undefined || mapa.nomeCompleto === undefined) return null
  return mapa
}

function texto(valor) {
  if (valor === null || valor === undefined) return ''
  return String(valor).trim()
}

/**
 * Interpreta a coluna de nascimento. Devolve { dataIso, diaMes }.
 * Aceita: só o dia ("9"), dd/mm, dd/mm/aaaa, aaaa-mm-dd, data do Excel.
 * `mesDoBloco` é usado quando a célula traz apenas o dia.
 */
function interpretarNascimento(valor, mesDoBloco) {
  const vazio = { dataIso: '', diaMes: '' }
  if (valor === null || valor === undefined || valor === '') return vazio

  const doIso = (ano, mes, dia) => ({
    dataIso: `${ano}-${mes}-${dia}`,
    diaMes: `${dia}/${mes}`,
  })

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const ano = String(valor.getUTCFullYear())
    const mes = String(valor.getUTCMonth() + 1).padStart(2, '0')
    const dia = String(valor.getUTCDate()).padStart(2, '0')
    return doIso(ano, mes, dia)
  }

  if (typeof valor === 'number') {
    // Número pequeno = só o dia do mês (formato da planilha de aniversariantes).
    if (Number.isInteger(valor) && valor >= 1 && valor <= 31) {
      if (!mesDoBloco) return vazio
      return { dataIso: '', diaMes: `${String(valor).padStart(2, '0')}/${String(mesDoBloco).padStart(2, '0')}` }
    }
    const d = XLSX.SSF.parse_date_code(valor)
    if (!d) return vazio
    return doIso(String(d.y), String(d.m).padStart(2, '0'), String(d.d).padStart(2, '0'))
  }

  const t = String(valor).trim()

  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return doIso(m[1], m[2], m[3])

  m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    let ano = m[3]
    if (ano.length === 2) ano = Number(ano) > 30 ? `19${ano}` : `20${ano}`
    return doIso(ano, m[2].padStart(2, '0'), m[1].padStart(2, '0'))
  }

  m = t.match(/^(\d{1,2})[/-](\d{1,2})$/)
  if (m) return { dataIso: '', diaMes: `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}` }

  m = t.match(/^(\d{1,2})$/)
  if (m && mesDoBloco) {
    const dia = Number(m[1])
    if (dia >= 1 && dia <= 31) {
      return { dataIso: '', diaMes: `${String(dia).padStart(2, '0')}/${String(mesDoBloco).padStart(2, '0')}` }
    }
  }

  return vazio
}

function mascararTelefone(valor) {
  const d = texto(valor).replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return texto(valor)
}

function mascararCep(valor) {
  const d = texto(valor).replace(/\D/g, '')
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : texto(valor)
}

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

async function documentoExiste(id) {
  const res = await fetch(`${BASE_URL}/${COLECAO}/${encodeURIComponent(id)}`)
  if (res.status === 404) return false
  if (!res.ok) throw new Error(`Falha ao consultar ${id}: ${res.status} ${await res.text()}`)
  return true
}

async function criarDocumento(id, dados) {
  const res = await fetch(`${BASE_URL}/${COLECAO}?documentId=${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encodeFields(dados) }),
  })
  if (res.status === 409) return false
  if (!res.ok) throw new Error(`Falha ao criar ${id}: ${res.status} ${await res.text()}`)
  return true
}

async function atualizarDocumento(id, dados) {
  const url = new URL(`${BASE_URL}/${COLECAO}/${encodeURIComponent(id)}`)
  Object.keys(dados).forEach((campo) => url.searchParams.append('updateMask.fieldPaths', campo))
  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encodeFields(dados) }),
  })
  if (!res.ok) throw new Error(`Falha ao atualizar ${id}: ${res.status} ${await res.text()}`)
}

/**
 * Mantém o contador de carnês à frente dos números importados, para que novos cadastros feitos
 * pela Pastoral não tentem reutilizar um número já ocupado.
 */
async function ajustarContador(maiorCarneImportado) {
  const proximo = Math.max(maiorCarneImportado + 1, NUMERO_CARNE_INICIAL)
  const docPath = 'contadores/proximoNumeroCarne'
  const existe = await fetch(`${BASE_URL}/${docPath}`).then((r) => r.ok)

  if (existe) {
    const url = new URL(`${BASE_URL}/${docPath}`)
    url.searchParams.append('updateMask.fieldPaths', 'valor')
    await fetch(url.toString(), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: encodeFields({ valor: proximo }) }),
    })
  } else {
    await fetch(`${BASE_URL}/contadores?documentId=proximoNumeroCarne`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: encodeFields({ valor: proximo }) }),
    })
  }

  return proximo
}

// ------------------------------------------------------------------ extração

/**
 * Varre uma aba de cima para baixo, alternando entre títulos de mês, cabeçalhos e linhas de
 * dados. Devolve a lista de registros crus encontrados.
 */
function extrairDaAba(sheet, nomeAba) {
  const grade = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: true, raw: false })
  const registros = []
  let mesAtual = null
  let cabecalho = null

  for (const [i, linhaBruta] of grade.entries()) {
    const linha = Array.isArray(linhaBruta) ? linhaBruta : []
    const preenchidas = linha.filter((c) => texto(c) !== '')
    if (preenchidas.length === 0) continue

    // 1) Título de mês (linha curta, sem cara de cabeçalho)
    const mes = detectarMes(linha)
    if (mes && !tentarCabecalho(linha)) {
      mesAtual = mes
      cabecalho = null
      continue
    }

    // 2) Cabeçalho
    const possivelCabecalho = tentarCabecalho(linha)
    if (possivelCabecalho) {
      cabecalho = possivelCabecalho
      continue
    }

    // 3) Linha de dados
    if (!cabecalho) continue

    const carne = texto(linha[cabecalho.numeroCarne]).replace(/\.0$/, '')
    const nome = texto(linha[cabecalho.nomeCompleto])
    if (!carne && !nome) continue

    registros.push({ linhaPlanilha: i + 1, aba: nomeAba, mes: mesAtual, cabecalho, celulas: linha })
  }

  return registros
}

/**
 * Classifica o parentesco a partir de anotações no próprio nome, como
 * "(CONJUGE JOSILDO)", "(ESPOSO)" ou "(Filha NADIR)".
 */
function detectarParentesco(nome) {
  const n = normalizar(nome)
  // Aceita variações e erros de digitação vistos na planilha: "CONJ.", "COJUGE", "ESPOSO".
  if (/\b(conj|conjug\w*|cojug\w*|espos[ao]|marido)\b/.test(n)) return 'conjuge'
  if (/\b(filh[oa]s?)\b/.test(n)) return 'filho'
  return null
}

function montarDizimista(registro) {
  const { cabecalho, celulas, mes } = registro
  const val = (campo) => (cabecalho[campo] !== undefined ? celulas[cabecalho[campo]] : undefined)

  // "394*" indica outra pessoa do MESMO carnê (normalmente o cônjuge). O carnê é o ID do
  // documento, então esses registros são agrupados no mesmo dizimista mais adiante.
  const carneBruto = texto(val('numeroCarne')).replace(/\.0$/, '')
  const numeroCarne = carneBruto.replace(/\*+$/, '').trim()
  const marcadoComAsterisco = /\*+$/.test(carneBruto)
  const nomeCompleto = texto(val('nomeCompleto'))
  if (!numeroCarne || !nomeCompleto) return null

  const nascimento = interpretarNascimento(val('dataNascimento'), mes)

  const filhos = []
  for (const col of cabecalho.filhos) {
    const nome = texto(celulas[col.nome])
    if (!nome) continue
    const nascFilho = col.nascimento !== null ? interpretarNascimento(celulas[col.nascimento], null) : { dataIso: '' }
    filhos.push({ nomeCompleto: nome, dataNascimento: nascFilho.dataIso })
  }

  const conjugeNome = texto(val('conjugeNome'))
  const conjugeNasc = interpretarNascimento(val('conjugeDataNascimento'), null)
  const agora = new Date().toISOString()

  return {
    numeroCarne,
    diaMes: nascimento.diaMes,
    marcadoComAsterisco,
    parentesco: detectarParentesco(nomeCompleto),
    dados: {
      numeroCarne,
      nomeCompleto,
      dataNascimento: nascimento.dataIso,
      diaMesNascimento: nascimento.diaMes,
      endereco: {
        cep: mascararCep(val('cep')),
        logradouro: texto(val('logradouro')),
        numero: texto(val('numeroCasa')),
        complemento: texto(val('complemento')),
        bairro: texto(val('bairro')),
        cidade: texto(val('cidade')),
        estado: texto(val('estado')).toUpperCase().slice(0, 2),
      },
      telefone: mascararTelefone(val('telefone')),
      email: texto(val('email')) || null,
      conjuge: conjugeNome ? { nomeCompleto: conjugeNome, dataNascimento: conjugeNasc.dataIso } : null,
      filhos,
      origem: 'importacao_planilha',
      criadoEm: agora,
      atualizadoEm: agora,
    },
  }
}

// -------------------------------------------------------------------- main

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const sobrescrever = args.includes('--sobrescrever')
  const abaIdx = args.indexOf('--aba')
  const abaEscolhida = abaIdx >= 0 ? args[abaIdx + 1] : null
  // O único argumento posicional é o arquivo (o valor de --aba não conta).
  const arquivo = args.find((a, i) => !a.startsWith('--') && !(abaIdx >= 0 && i === abaIdx + 1))

  if (!arquivo) {
    console.error('Uso: node scripts/importar-dizimistas.mjs <planilha.xlsx> [--dry-run] [--sobrescrever] [--aba "Nome"]')
    process.exit(1)
  }
  if (!fs.existsSync(arquivo)) {
    console.error(`ERRO: arquivo não encontrado: ${arquivo}`)
    process.exit(1)
  }

  const wb = abrirPlanilha(arquivo)
  const abas = abaEscolhida ? [abaEscolhida] : wb.SheetNames

  console.log(`\nProjeto Firebase : ${PROJECT_ID}`)
  console.log(`Planilha         : ${arquivo}`)
  console.log(`Abas             : ${abas.join(', ')}`)
  console.log(
    `Modo             : ${dryRun ? 'DRY-RUN (nada será gravado)' : sobrescrever ? 'GRAVAR + sobrescrever existentes' : 'GRAVAR (pula existentes)'}`,
  )

  const registros = []
  for (const nomeAba of abas) {
    const sheet = wb.Sheets[nomeAba]
    if (!sheet) {
      console.error(`\nERRO: aba "${nomeAba}" não encontrada. Abas: ${wb.SheetNames.join(', ')}`)
      process.exit(1)
    }
    registros.push(...extrairDaAba(sheet, nomeAba))
  }

  if (registros.length === 0) {
    console.error('\nERRO: nenhuma linha de dados reconhecida.')
    console.error('Verifique se existe um cabeçalho com as colunas de número do carnê e nome.')
    process.exit(1)
  }

  console.log(`Linhas de dados  : ${registros.length}`)

  const resultado = { criados: 0, atualizados: 0, pulados: 0, invalidos: 0, semNascimento: [] }
  let maiorCarne = 0
  let amostraImpressa = false

  // --- Agrupa por carnê: um carnê = uma família (titular + cônjuge/filhos) ---
  const grupos = new Map()

  for (const registro of registros) {
    const montado = montarDizimista(registro)
    const origem = `${registro.aba}!linha ${registro.linhaPlanilha}`

    if (!montado) {
      resultado.invalidos++
      console.log(`  ${origem}: IGNORADA (sem nº de carnê ou sem nome)`)
      continue
    }

    if (!grupos.has(montado.numeroCarne)) grupos.set(montado.numeroCarne, [])
    grupos.get(montado.numeroCarne).push({ ...montado, origem })
  }

  const fusoes = []

  for (const [numeroCarne, membros] of grupos) {
    if (membros.length === 1) continue

    // Titular: primeira linha sem "*" e sem anotação de parentesco; senão, a primeira.
    const idxTitular = membros.findIndex((m) => !m.marcadoComAsterisco && !m.parentesco)
    const titular = membros[idxTitular >= 0 ? idxTitular : 0]
    const outros = membros.filter((m) => m !== titular)

    for (const outro of outros) {
      const familiar = {
        nomeCompleto: outro.dados.nomeCompleto,
        dataNascimento: outro.dados.dataNascimento,
        diaMesNascimento: outro.dados.diaMesNascimento,
      }

      // Sem anotação de parentesco não dá para afirmar que é cônjuge — entra como familiar.
      const comoConjuge = outro.parentesco === 'conjuge' && !titular.dados.conjuge

      if (comoConjuge) titular.dados.conjuge = familiar
      else titular.dados.filhos.push(familiar)

      fusoes.push(
        `  carnê ${numeroCarne}: "${familiar.nomeCompleto}" (${outro.origem}) → ${comoConjuge ? 'cônjuge' : 'familiar'} de "${titular.dados.nomeCompleto}"` +
          (outro.parentesco ? '' : '  [parentesco não declarado — revisar]'),
      )
    }

    grupos.set(numeroCarne, [titular])
  }

  if (fusoes.length) {
    console.log(`\n--- Carnês com mais de uma pessoa (${fusoes.length} agrupamento(s)) ---`)
    fusoes.forEach((l) => console.log(l))
  }

  console.log('\n--- Processando ---')

  for (const [numeroCarne, membros] of grupos) {
    const { dados, diaMes } = membros[0]

    if (!diaMes) resultado.semNascimento.push(numeroCarne)

    const numerico = Number(numeroCarne)
    if (Number.isInteger(numerico)) maiorCarne = Math.max(maiorCarne, numerico)

    if (dryRun) {
      console.log(
        `  ${numeroCarne.padEnd(8)} ${(diaMes || '--/--').padEnd(7)} ${dados.nomeCompleto}${diaMes ? '' : '   [sem nascimento]'}`,
      )
      if (!amostraImpressa) {
        amostraImpressa = true
        console.log('\n  Amostra do 1º registro (confira se o mapeamento está correto):')
        console.log(
          JSON.stringify(dados, null, 2)
            .split('\n')
            .map((l) => `    ${l}`)
            .join('\n'),
        )
        console.log('')
      }
      resultado.criados++
      continue
    }

    const jaExiste = await documentoExiste(numeroCarne)

    if (jaExiste && !sobrescrever) {
      resultado.pulados++
      console.log(`  ${numeroCarne.padEnd(8)} PULADO (já existe)`)
      continue
    }

    if (jaExiste) {
      const { criadoEm, ...semCriadoEm } = dados
      void criadoEm
      await atualizarDocumento(numeroCarne, semCriadoEm)
      resultado.atualizados++
      console.log(`  ${numeroCarne.padEnd(8)} ATUALIZADO  ${dados.nomeCompleto}`)
    } else {
      await criarDocumento(numeroCarne, dados)
      resultado.criados++
      console.log(`  ${numeroCarne.padEnd(8)} CRIADO      ${dados.nomeCompleto}`)
    }
  }

  console.log('\n--- Resumo ---')
  console.log(`  Criados     : ${resultado.criados}`)
  console.log(`  Atualizados : ${resultado.atualizados}`)
  console.log(`  Pulados     : ${resultado.pulados}`)
  console.log(`  Inválidos   : ${resultado.invalidos}`)

  if (resultado.semNascimento.length) {
    console.log(
      `\n  ATENÇÃO: ${resultado.semNascimento.length} registro(s) sem dia/mês de nascimento — essas pessoas` +
        `\n  não conseguirão ENTRAR no site (o login é carnê + dia/mês), mas ainda podem se` +
        `\n  recadastrar normalmente. Carnês: ${resultado.semNascimento.join(', ')}`,
    )
  }

  if (!dryRun && maiorCarne > 0) {
    const proximo = await ajustarContador(maiorCarne)
    console.log(`\n  Contador de novos carnês ajustado para: ${proximo}`)
  }

  console.log(dryRun ? '\nDry-run concluído — nada foi gravado.\n' : '\nImportação concluída.\n')
}

main().catch((err) => {
  console.error('\nERRO durante a importação:', err.message)
  process.exit(1)
})
