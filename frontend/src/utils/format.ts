import { CARNE_AVULSO } from '@/constants/devolucao'

export function formatCurrency(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split('-')
  const data = new Date(Number(ano), Number(mes) - 1, 1)
  const texto = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** "aaaa-mm" -> "ago/26", usado em rótulos compactos de gráfico. */
export function competenciaCurta(competencia: string): string {
  const [ano, mes] = competencia.split('-')
  const data = new Date(Number(ano), Number(mes) - 1, 1)
  return data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
}

export function formatPercent(valor: number): string {
  return `${valor.toFixed(0)}%`
}

export function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return `${primeira}${ultima}`.toUpperCase()
}

/** "1" -> "001", "25" -> "025", "500" -> "500". Só exibição — o número salvo no banco não muda. */
export function formatarNumeroCarne(numeroCarne: string): string {
  return numeroCarne.padStart(3, '0')
}

/**
 * Remove zeros à esquerda digitados por engano ("001" -> "1", "026" -> "26"), para que o carnê
 * seja encontrado independente de ter sido digitado com ou sem o preenchimento de 3 dígitos.
 *
 * `CARNE_AVULSO` ("000") fica de fora dessa regra — é um valor reservado, não um carnê real, e a
 * mesma lógica de zeros à esquerda o reduziria para "0", quebrando as comparações que dependem do
 * valor exato salvo no Firestore.
 */
export function normalizarNumeroCarne(valor: string): string {
  const bruto = valor.trim()
  if (bruto === CARNE_AVULSO) return bruto
  return bruto.replace(/^0+(?=\d)/, '')
}

export function maskCpf(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskCnpj(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function maskTelefone(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function maskCep(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function maskCartao(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function maskValidade(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 4)
    .replace(/(\d{2})(\d)/, '$1/$2')
}

export function maskCvv(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 4)
}

export function maskDataBr(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
}

export function dataBrEhValida(valorBr: string): boolean {
  const match = valorBr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return false

  const dia = Number(match[1])
  const mes = Number(match[2])
  const ano = Number(match[3])
  // Sem limite inferior de propósito — a Pastoral às vezes precisa registrar datas bem antigas
  // (ex.: cópias de registros antigos, "02/09/1700"). Só não aceita ano no futuro.
  if (ano < 1 || ano > new Date().getFullYear()) return false

  const data = new Date(ano, mes - 1, dia)
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia
}

export function dataBrParaIso(valorBr: string): string {
  const match = valorBr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return ''
  const [, dia, mes, ano] = match
  return `${ano}-${mes}-${dia}`
}

/**
 * Máscara monetária no padrão brasileiro, para digitação ao vivo (onChange). Na maioria das
 * devoluções o valor é fechado (sem centavos), então sem vírgula digitada o número é tratado
 * como reais inteiros — só ganha ponto de milhar ("1234" -> "1.234"), sem completar ",00" ainda
 * (isso fica pra `finalizarMoeda`, no blur, pra não embaralhar o que a pessoa está digitando).
 * Ao digitar uma vírgula, os centavos passam a ser exatamente o que vier depois dela (até 2
 * dígitos), sem completar com zero — é o sinal de que a pessoa quer especificar os centavos.
 */
export function maskMoeda(valor: string): string {
  let limpo = valor.replace(/[^\d,]/g, '')

  const primeiraVirgula = limpo.indexOf(',')
  if (primeiraVirgula !== -1) {
    limpo = limpo.slice(0, primeiraVirgula + 1) + limpo.slice(primeiraVirgula + 1).replace(/,/g, '')
  }

  const [parteInteira, parteDecimal] = limpo.split(',')
  const inteiroFormatado = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return parteDecimal === undefined ? inteiroFormatado : `${inteiroFormatado},${parteDecimal.slice(0, 2)}`
}

/**
 * Máscara monetária "calculadora": os dígitos digitados são sempre os centavos, deslocando pra
 * esquerda a cada tecla ("1" -> "0,01", "150" -> "1,50") — já sai formatada, sem precisar digitar
 * vírgula nem completar nada no blur. Usada onde os centavos importam de verdade (Tesouraria),
 * diferente de `maskMoeda` (pensada pra valores fechados, como as devoluções de dízimo).
 */
export function maskMoedaCentavos(valor: string): string {
  const digitos = valor.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  const centavos = digitos.padStart(3, '0')
  const parteDecimal = centavos.slice(-2)
  const parteInteira = centavos.slice(0, -2).replace(/^0+(?=\d)/, '') || '0'
  const inteiroFormatado = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${inteiroFormatado},${parteDecimal}`
}

/** Chave de acesso da NF-e: 44 dígitos, exibidos em grupos de 4 pra ficar mais fácil de conferir. */
export function maskChaveNfe(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 44)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function chaveNfeEhValida(valor: string): boolean {
  return valor.replace(/\D/g, '').length === 44
}

/**
 * Finaliza o valor ao sair do campo (blur): fecha em ",00" quando nenhuma vírgula foi digitada,
 * ou completa os centavos digitados para 2 dígitos ("100" -> "100,00", "100,5" -> "100,50").
 */
export function finalizarMoeda(valor: string): string {
  if (!valor) return valor
  const [parteInteira, parteDecimal] = valor.split(',')
  const inteiro = parteInteira || '0'
  return `${inteiro},${(parteDecimal ?? '').padEnd(2, '0').slice(0, 2)}`
}

/**
 * Converte o texto mascarado no número correspondente. Interpreta tanto valores já finalizados
 * ("1.234,56") quanto ainda sem vírgula ("1.234", tratado como reais inteiros).
 */
export function moedaParaNumero(valor: string): number {
  if (!valor) return 0
  const [parteInteira, parteDecimal] = valor.split(',')
  const inteiro = parteInteira.replace(/\D/g, '') || '0'
  const decimal = (parteDecimal ?? '').replace(/\D/g, '').padEnd(2, '0').slice(0, 2)
  return Number(`${inteiro}${decimal}`) / 100
}

/** Caminho inverso de `moedaParaNumero`: usado pra pré-preencher o campo de valor ao editar. */
export function numeroParaMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function maskMesAno(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 6)
    .replace(/(\d{2})(\d)/, '$1/$2')
}

export function mesAnoEhValido(valor: string): boolean {
  const match = valor.match(/^(\d{2})\/(\d{4})$/)
  if (!match) return false
  const mes = Number(match[1])
  const ano = Number(match[2])
  return mes >= 1 && mes <= 12 && ano >= 1900 && ano <= new Date().getFullYear() + 1
}

/** "mm/aaaa" -> "aaaa-mm" */
export function mesAnoParaCompetencia(valor: string): string {
  const match = valor.match(/^(\d{2})\/(\d{4})$/)
  return match ? `${match[2]}-${match[1]}` : ''
}

/** "aaaa-mm" -> "mm/aaaa" */
export function competenciaParaMesAno(competencia: string): string {
  const match = competencia.match(/^(\d{4})-(\d{2})$/)
  return match ? `${match[2]}/${match[1]}` : ''
}

export function competenciaAtual(): string {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

/** Competência ("aaaa-mm") `meses` antes de `competencia`. `subtrairMeses('2026-02', 3) -> '2025-11'`. */
export function subtrairMeses(competencia: string, meses: number): string {
  const [ano, mes] = competencia.split('-').map(Number)
  const data = new Date(ano, mes - 1 - meses, 1)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Lista as competências ("aaaa-mm") de `inicio` até `fim`, inclusive. Usada para descobrir os
 * meses que o dizimista deveria ter devolvido desde que se recadastrou.
 */
export function competenciasEntre(inicio: string, fim: string): string[] {
  if (!/^\d{4}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}$/.test(fim) || inicio > fim) return []

  const competencias: string[] = []
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

export function maskDiaMes(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 4)
    .replace(/(\d{2})(\d)/, '$1/$2')
}

export function diaMesEhValido(valor: string): boolean {
  const match = valor.match(/^(\d{2})\/(\d{2})$/)
  if (!match) return false

  const dia = Number(match[1])
  const mes = Number(match[2])
  if (mes < 1 || mes > 12 || dia < 1) return false

  // Ano bissexto para permitir 29/02.
  const diasNoMes = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return dia <= diasNoMes[mes - 1]
}

/** "aaaa-mm-dd" -> "dd/mm". Aceita ausente/vazio: nem todo registro tem a data completa. */
export function isoParaDiaMes(valorIso?: string): string {
  const match = (valorIso ?? '').match(/^\d{4}-(\d{2})-(\d{2})$/)
  return match ? `${match[2]}/${match[1]}` : ''
}

/** "dd/mm" -> 8 (mês, 1-12) — usado para gravar `mesNascimento` e consultar aniversariantes por mês direto no Firestore, sem varrer a coleção inteira. Undefined quando o formato não bate. */
export function mesDoRegistro(diaMes: string): number | undefined {
  const match = diaMes.match(/^\d{2}\/(\d{2})$/)
  if (!match) return undefined
  const mes = Number(match[1])
  return mes >= 1 && mes <= 12 ? mes : undefined
}

export function dataIsoParaBr(valorIso?: string): string {
  const match = (valorIso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  const [, ano, mes, dia] = match
  return `${dia}/${mes}/${ano}`
}
