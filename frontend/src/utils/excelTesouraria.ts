import * as XLSX from 'xlsx'

import type { ControleTesouraria } from '@/types'
import { STATUS_CONTROLE_TESOURARIA, categoriaEntradaLabel } from '@/constants/tesouraria'
import { formaPagamentoLabel } from '@/constants/devolucao'
import { dataIsoParaBr, formatCompetencia } from '@/utils/format'

/**
 * Gera e baixa uma planilha .xlsx do controle mensal: resumo, receitas e despesas em abas
 * separadas. Valores em R$ vão como número puro (não texto formatado), pra dar pra somar/filtrar
 * direto na planilha.
 */
export function gerarExcelControleTesouraria(controle: ControleTesouraria): void {
  const totalReceitas = controle.entradas.reduce((soma, e) => soma + e.valor, 0)
  const totalDespesas = controle.saidas.reduce((soma, s) => soma + s.valor, 0)
  const saldo = totalReceitas - totalDespesas

  const receitasOrdenadas = [...controle.entradas].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
  const despesasOrdenadas = [...controle.saidas].sort((a, b) => (a.dia < b.dia ? 1 : a.dia > b.dia ? -1 : 0))

  const wb = XLSX.utils.book_new()

  const resumo = XLSX.utils.aoa_to_sheet([
    ['Capela Nossa Senhora de Lourdes — Tesouraria'],
    [`Controle de ${formatCompetencia(controle.competencia)}`],
    [],
    ['Status', STATUS_CONTROLE_TESOURARIA[controle.status]],
    ['Total de receitas', totalReceitas],
    ['Total de despesas', totalDespesas],
    ['Saldo do mês', saldo],
  ])
  XLSX.utils.book_append_sheet(wb, resumo, 'Resumo')

  const receitas = XLSX.utils.aoa_to_sheet([
    ['Data', 'Categoria', 'Forma de pagamento', 'Valor', 'Observação'],
    ...receitasOrdenadas.map((e) => [
      e.data ? dataIsoParaBr(e.data) : '',
      categoriaEntradaLabel(e.categoria),
      formaPagamentoLabel(e.formaPagamento),
      e.valor,
      e.observacao || '',
    ]),
  ])
  XLSX.utils.book_append_sheet(wb, receitas, 'Receitas')

  const despesas = XLSX.utils.aoa_to_sheet([
    ['Dia', 'Quem solicitou', 'Empresa/Prestador', 'Valor', 'Quitado', 'Possui NF-e', 'Chave NF-e', 'Observação'],
    ...despesasOrdenadas.map((s) => [
      s.dia ? dataIsoParaBr(s.dia) : '',
      s.solicitante,
      s.prestador,
      s.valor,
      s.quitado ? 'Sim' : 'Não',
      s.possuiNfe ? 'Sim' : 'Não',
      s.possuiNfe ? s.chaveNfe || '' : '',
      s.observacao || '',
    ]),
  ])
  XLSX.utils.book_append_sheet(wb, despesas, 'Despesas')

  XLSX.writeFile(wb, `tesouraria-${controle.competencia}.xlsx`)
}
