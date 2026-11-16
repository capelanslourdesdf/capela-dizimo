import * as XLSX from 'xlsx'

import type { Dizimista } from '@/types'
import { formatarNumeroCarne } from '@/utils/format'

/** Gera e baixa uma planilha .xlsx só com nº do carnê e nome — lista simples de conferência. */
export function gerarExcelDizimistas(dizimistas: Pick<Dizimista, 'numeroCarne' | 'nomeCompleto'>[], nomeArquivo: string): void {
  const ordenados = [...dizimistas].sort((a, b) => Number(a.numeroCarne) - Number(b.numeroCarne))

  const planilha = XLSX.utils.aoa_to_sheet([
    ['Nº do carnê', 'Nome completo'],
    ...ordenados.map((d) => [formatarNumeroCarne(d.numeroCarne), d.nomeCompleto]),
  ])
  planilha['!cols'] = [{ wch: 12 }, { wch: 40 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, planilha, 'Dizimistas')
  XLSX.writeFile(wb, nomeArquivo)
}
