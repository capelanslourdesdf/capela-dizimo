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

export function formatPercent(valor: number): string {
  return `${valor.toFixed(0)}%`
}

export function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return `${primeira}${ultima}`.toUpperCase()
}

export function maskCpf(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
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
  if (ano < 1900 || ano > new Date().getFullYear()) return false

  const data = new Date(ano, mes - 1, dia)
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia
}

export function dataBrParaIso(valorBr: string): string {
  const match = valorBr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return ''
  const [, dia, mes, ano] = match
  return `${ano}-${mes}-${dia}`
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

/** "aaaa-mm-dd" -> "dd/mm" */
export function isoParaDiaMes(valorIso: string): string {
  const match = valorIso.match(/^\d{4}-(\d{2})-(\d{2})$/)
  return match ? `${match[2]}/${match[1]}` : ''
}

export function dataIsoParaBr(valorIso: string): string {
  const match = valorIso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  const [, ano, mes, dia] = match
  return `${dia}/${mes}/${ano}`
}
