import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import type { ControleTesouraria } from '@/types'
import { CATEGORIAS_ENTRADA_TESOURARIA, STATUS_CONTROLE_TESOURARIA, URL_CONSULTA_NFE, categoriaEntradaLabel } from '@/constants/tesouraria'
import { FORMAS_PAGAMENTO_DEVOLUCAO, formaPagamentoLabel } from '@/constants/devolucao'
import { formatCompetencia, formatCurrency, formatDate, formatDateLong, maskChaveNfe } from '@/utils/format'

/** Azul de Nossa Senhora de Lourdes — o mesmo azul usado como cor primária no site (--primary, em index.css), convertido pra RGB. */
const AZUL_NOSSA_SENHORA_LOURDES: [number, number, number] = [11, 146, 218]

/** Ponto em que a última tabela desenhada terminou — usado pra empilhar as seções sem sobrepor. */
function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

/** Quem consta no fim do controle mensal — fixo, como o nome da Capela logo abaixo. */
const RESPONSAVEIS = [
  { nome: 'Carlos Eduardo Silva Barbosa', cargo: 'Tesoureiro' },
  { nome: 'Lucylene Valério Rocha', cargo: 'Coordenadora' },
  { nome: 'Luiz Caetano', cargo: 'Pároco' },
]

/** Desenha os nomes dos responsáveis no fim do documento, abrindo página nova se não couber. Sem linha de assinatura — é só identificação, o documento não é assinado fisicamente. */
function desenharResponsaveis(doc: jsPDF, margemEsquerda: number, larguraPagina: number): void {
  const alturaPagina = doc.internal.pageSize.getHeight()
  const alturaNecessaria = 30
  let y = finalY(doc) + 24

  if (y + alturaNecessaria > alturaPagina - 15) {
    doc.addPage()
    y = 30
  }

  const larguraUtil = larguraPagina - margemEsquerda * 2
  const larguraColuna = larguraUtil / RESPONSAVEIS.length

  RESPONSAVEIS.forEach((responsavel, indice) => {
    const xInicio = margemEsquerda + indice * larguraColuna + 4
    const xFim = margemEsquerda + (indice + 1) * larguraColuna - 4
    const xCentro = (xInicio + xFim) / 2

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0)
    doc.text(responsavel.nome, xCentro, y + 5, { align: 'center' })

    doc.setFontSize(8)
    doc.setTextColor(110)
    doc.text(responsavel.cargo, xCentro, y + 10, { align: 'center' })
  })

  doc.setTextColor(0)
}

/**
 * Gera e baixa o PDF do controle mensal da Tesouraria: cabeçalho, resumo, receitas (com totais
 * por categoria) e despesas — tudo o que existe no controle, numa página fluida (a tabela quebra
 * de página sozinha se a lista for longa).
 */
export function gerarPdfControleTesouraria(controle: ControleTesouraria): void {
  const doc = new jsPDF({ orientation: 'landscape' })
  const margemEsquerda = 14
  const larguraPagina = doc.internal.pageSize.getWidth()

  const totalReceitas = controle.entradas.reduce((soma, e) => soma + e.valor, 0)
  const totalDespesas = controle.saidas.reduce((soma, s) => soma + s.valor, 0)
  const saldo = totalReceitas - totalDespesas

  const receitasOrdenadas = [...controle.entradas].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
  const despesasOrdenadas = [...controle.saidas].sort((a, b) => (a.dia < b.dia ? 1 : a.dia > b.dia ? -1 : 0))

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
      ['Total de receitas', formatCurrency(totalReceitas)],
      ['Total de despesas', formatCurrency(totalDespesas)],
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
    doc.text('Receitas por categoria', margemEsquerda, finalY(doc) + 10)

    autoTable(doc, {
      startY: finalY(doc) + 14,
      head: [['Categoria', 'Total']],
      body: totaisPorCategoria.map((c) => [c.categoria, formatCurrency(c.total)]),
      theme: 'striped',
      headStyles: { fillColor: AZUL_NOSSA_SENHORA_LOURDES },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: margemEsquerda, right: larguraPagina - margemEsquerda - 90 },
    })
  }

  const totaisPorForma = FORMAS_PAGAMENTO_DEVOLUCAO.map((forma) => ({
    forma: forma.label,
    total: controle.entradas.filter((e) => e.formaPagamento === forma.value).reduce((soma, e) => soma + e.valor, 0),
  })).filter((f) => f.total > 0)

  if (totaisPorForma.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Receitas por forma de pagamento', margemEsquerda, finalY(doc) + 10)

    autoTable(doc, {
      startY: finalY(doc) + 14,
      head: [['Forma', 'Total']],
      body: totaisPorForma.map((f) => [f.forma, formatCurrency(f.total)]),
      theme: 'striped',
      headStyles: { fillColor: AZUL_NOSSA_SENHORA_LOURDES },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: margemEsquerda, right: larguraPagina - margemEsquerda - 90 },
    })
  }

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Receitas detalhadas', margemEsquerda, finalY(doc) + 10)

  autoTable(doc, {
    startY: finalY(doc) + 14,
    head: [['Data', 'Categoria', 'Forma', 'Valor', 'Observação']],
    body:
      receitasOrdenadas.length > 0
        ? receitasOrdenadas.map((e) => [
            e.data ? formatDate(e.data) : '—',
            categoriaEntradaLabel(e.categoria),
            formaPagamentoLabel(e.formaPagamento),
            formatCurrency(e.valor),
            e.observacao || '—',
          ])
        : [['Nenhuma receita lançada neste mês.', '', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: AZUL_NOSSA_SENHORA_LOURDES },
    styles: { fontSize: 9 },
    columnStyles: { 3: { halign: 'right', cellWidth: 24 } },
    margin: { left: margemEsquerda, right: margemEsquerda },
  })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Despesas', margemEsquerda, finalY(doc) + 10)

  autoTable(doc, {
    startY: finalY(doc) + 14,
    head: [['Dia', 'Solicitante', 'Empresa/Prestador', 'Valor', 'Quitado', 'Chave de acesso NF-e', 'Observação']],
    body:
      despesasOrdenadas.length > 0
        ? despesasOrdenadas.map((s) => [
            s.dia ? formatDate(s.dia) : '—',
            s.solicitante,
            s.prestador,
            formatCurrency(s.valor),
            s.quitado ? 'Sim' : 'Não',
            s.possuiNfe && s.chaveNfe ? maskChaveNfe(s.chaveNfe) : '—',
            s.observacao || '—',
          ])
        : [['Nenhuma despesa lançada neste mês.', '', '', '', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: AZUL_NOSSA_SENHORA_LOURDES },
    styles: { fontSize: 9 },
    columnStyles: { 3: { halign: 'right', cellWidth: 22 }, 5: { cellWidth: 40, fontSize: 7.5 } },
    margin: { left: margemEsquerda, right: margemEsquerda },
  })

  if (despesasOrdenadas.some((s) => s.possuiNfe)) {
    doc.setFontSize(7.5)
    doc.setTextColor(20, 90, 160)
    doc.textWithLink('Consultar NF-e no portal da Receita (cole a chave de acesso lá)', margemEsquerda, finalY(doc) + 6, {
      url: URL_CONSULTA_NFE,
    })
    doc.setTextColor(0)
  }

  desenharResponsaveis(doc, margemEsquerda, larguraPagina)

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
