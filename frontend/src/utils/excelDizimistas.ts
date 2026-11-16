import * as XLSX from 'xlsx'

import type { Dizimista } from '@/types'
import { diaMesDoRegistro } from '@/services/dizimistaService'
import { dataIsoParaBr, formatarNumeroCarne } from '@/utils/format'

/**
 * Data de nascimento pro Excel: completa (dd/mm/aaaa) quando existe; cai pro dia/mês (sem ano,
 * `diaMesNascimento`) em registros antigos importados da planilha que não têm o ano — melhor
 * mostrar o que der do que deixar em branco. Só vazio quando não há nenhum dos dois.
 */
function dataNascimentoParaExcel(d: Dizimista): string {
  if (d.dataNascimento) return dataIsoParaBr(d.dataNascimento)
  const diaMes = diaMesDoRegistro(d)
  return /^\d{2}\/\d{2}$/.test(diaMes) ? diaMes : ''
}

/** Gera e baixa uma planilha .xlsx com nº do carnê, nome e data de nascimento — lista de conferência. */
export function gerarExcelDizimistas(dizimistas: Dizimista[], nomeArquivo: string): void {
  const ordenados = [...dizimistas].sort((a, b) => Number(a.numeroCarne) - Number(b.numeroCarne))

  const planilha = XLSX.utils.aoa_to_sheet([
    ['Nº do carnê', 'Nome completo', 'Data de nascimento'],
    ...ordenados.map((d) => [formatarNumeroCarne(d.numeroCarne), d.nomeCompleto, dataNascimentoParaExcel(d)]),
  ])
  planilha['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 16 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, planilha, 'Dizimistas')
  XLSX.writeFile(wb, nomeArquivo)
}
