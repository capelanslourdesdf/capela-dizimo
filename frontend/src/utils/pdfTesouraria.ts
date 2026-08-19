import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import type { ControleTesouraria } from '@/types'
import { CATEGORIAS_ENTRADA_TESOURARIA, STATUS_CONTROLE_TESOURARIA, categoriaEntradaLabel } from '@/constants/tesouraria'
import { formatCompetencia, formatCurrency, formatDate, formatDateLong } from '@/utils/format'

/** Ponto em que a última tabela desenhada terminou — usado pra empilhar as seções sem sobrepor. */
function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

/**
 * Gera e baixa o PDF do controle mensal da Tesouraria: cabeçalho, resumo, entradas (com totais
 * por categoria) e saídas — tudo o que existe no controle, numa página fluida (a tabela quebra
 * de página sozinha se a lista for longa).
 */
export function gerarPdfControleTesouraria(controle: ControleTesouraria): void {
  const doc = new jsPDF()
  const margemEsquerda = 14
  const larguraPagina = doc.internal.pageSize.getWidth()

  const totalEntradas = controle.entradas.reduce((soma, e) => soma + e.valor, 0)
  const totalSaidas = controle.saidas.reduce((soma, s) => soma + s.valor, 0)
  const saldo = totalEntradas - totalSaidas

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Capela Nossa Senhora de Lourdes', margemEsquerda, 18)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Tesouraria — Controle de ${formatCompetencia(controle.competencia)}`, margemEsquerda, 26)

  doc.setFontSize(9)
  doc.setTextColor(110)
  doc.text(
    `Status: ${STATUS_CONTROLE_TESOURARIA[controle.status]}  ·  Gerado em ${formatDateLong(new Date().toISOString().slice(0, 10))}`,
    margemEsquerda,
    32,
  )
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 38,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: { top: 1.5, bottom: 1.5, left: 0, right: 6 } },
    body: [
      ['Total de entradas', formatCurrency(totalEntradas)],
      ['Total de saídas', formatCurrency(totalSaidas)],
      ['Saldo do mês', formatCurrency(saldo)],
    ],
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
    margin: { left: margemEsquerda },
    tableWidth: 90,
  })

  const totaisPorCategoria = CATEGORIAS_ENTRADA_TESOURARIA.map((cat) => ({
    categoria: cat.label,
    total: controle.entradas.filter((e) => e.categoria === cat.value).reduce((soma, e) => soma + e.valor, 0),
  })).filter((c) => c.total > 0)

  if (totaisPorCategoria.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Entradas por categoria', margemEsquerda, finalY(doc) + 10)

    autoTable(doc, {
      startY: finalY(doc) + 14,
      head: [['Categoria', 'Total']],
      body: totaisPorCategoria.map((c) => [c.categoria, formatCurrency(c.total)]),
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: margemEsquerda, right: larguraPagina - margemEsquerda - 90 },
    })
  }

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Entradas detalhadas', margemEsquerda, finalY(doc) + 10)

  autoTable(doc, {
    startY: finalY(doc) + 14,
    head: [['Categoria', 'Valor', 'Observação']],
    body:
      controle.entradas.length > 0
        ? controle.entradas.map((e) => [categoriaEntradaLabel(e.categoria), formatCurrency(e.valor), e.observacao || '—'])
        : [['Nenhuma entrada lançada neste mês.', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85] },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right', cellWidth: 28 } },
    margin: { left: margemEsquerda, right: margemEsquerda },
  })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Saídas', margemEsquerda, finalY(doc) + 10)

  autoTable(doc, {
    startY: finalY(doc) + 14,
    head: [['Dia', 'Solicitante', 'Empresa/Prestador', 'Valor', 'Observação']],
    body:
      controle.saidas.length > 0
        ? controle.saidas.map((s) => [
            s.dia ? formatDate(s.dia) : '—',
            s.solicitante,
            s.prestador,
            formatCurrency(s.valor),
            s.observacao || '—',
          ])
        : [['Nenhuma saída lançada neste mês.', '', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85] },
    styles: { fontSize: 9 },
    columnStyles: { 3: { halign: 'right', cellWidth: 26 } },
    margin: { left: margemEsquerda, right: margemEsquerda },
  })

  const totalPaginas = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    doc.setPage(pagina)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`Página ${pagina} de ${totalPaginas}`, larguraPagina - margemEsquerda, doc.internal.pageSize.getHeight() - 8, {
      align: 'right',
    })
  }

  doc.save(`tesouraria-${controle.competencia}.pdf`)
}
