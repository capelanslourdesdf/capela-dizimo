import * as React from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { GraficoLinhaMultiSerie, type SerieGraficoLinha } from '@/components/dashboard/GraficoLinhaMultiSerie'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { listarControlesTesouraria, receitasDizimoDaCompetencia } from '@/services/tesourariaService'
import { listarTodasDevolucoesPorCarne } from '@/services/devolucaoService'
import type { ControleTesouraria, Devolucao } from '@/types'
import { CATEGORIAS_ENTRADA_TESOURARIA, COMPETENCIA_INICIAL_TESOURARIA } from '@/constants/tesouraria'

/**
 * Paleta categórica fixa pra receita por categoria (ver --chart-1..7 em index.css) — a cor de uma
 * categoria nunca muda, mesmo que outra sem nenhum lançamento no período fique de fora do gráfico.
 *
 * As classes vêm escritas por extenso (nunca `` `stroke-${cor}` ``) de propósito: o Tailwind
 * descobre quais classes existem varrendo o código-fonte por strings literais — uma classe só
 * montada em tempo de execução não aparece nesse texto e é removida do CSS final.
 */
const CLASSES_CATEGORIA = [
  { stroke: 'stroke-chart-1', fill: 'fill-chart-1' },
  { stroke: 'stroke-chart-2', fill: 'fill-chart-2' },
  { stroke: 'stroke-chart-3', fill: 'fill-chart-3' },
  { stroke: 'stroke-chart-4', fill: 'fill-chart-4' },
  { stroke: 'stroke-chart-5', fill: 'fill-chart-5' },
  { stroke: 'stroke-chart-6', fill: 'fill-chart-6' },
  { stroke: 'stroke-chart-7', fill: 'fill-chart-7' },
]

export function EvolucaoTesourariaPage() {
  const [controles, setControles] = React.useState<ControleTesouraria[]>([])
  const [todasDevolucoes, setTodasDevolucoes] = React.useState<Devolucao[]>([])
  const [carregando, setCarregando] = React.useState(true)

  React.useEffect(() => {
    // O gráfico só cobre desde o início do controle da Tesouraria — não precisa do histórico
    // inteiro de devoluções.
    Promise.all([listarControlesTesouraria(), listarTodasDevolucoesPorCarne(COMPETENCIA_INICIAL_TESOURARIA)])
      .then(([lista, porCarne]) => {
        setControles(lista)
        setTodasDevolucoes(Object.values(porCarne).flat())
      })
      .finally(() => setCarregando(false))
  }, [])

  const controlesOrdenados = React.useMemo(
    () => [...controles].sort((a, b) => (a.competencia > b.competencia ? 1 : -1)),
    [controles],
  )
  const competencias = React.useMemo(() => controlesOrdenados.map((c) => c.competencia), [controlesOrdenados])

  const totaisPorCompetencia = React.useMemo(
    () =>
      controlesOrdenados.map((c) => ({
        entradas:
          c.entradas.reduce((s, e) => s + e.valor, 0) +
          receitasDizimoDaCompetencia(c.competencia, todasDevolucoes).reduce((s, e) => s + e.valor, 0),
        saidas: c.saidas.reduce((s, sa) => s + sa.valor, 0),
      })),
    [controlesOrdenados, todasDevolucoes],
  )

  const seriesEntradasSaidas: SerieGraficoLinha[] = [
    {
      id: 'entradas',
      label: 'Entradas',
      valores: totaisPorCompetencia.map((t) => t.entradas),
      classeStroke: 'stroke-success',
      classeFill: 'fill-success',
    },
    {
      id: 'saidas',
      label: 'Saídas',
      valores: totaisPorCompetencia.map((t) => t.saidas),
      classeStroke: 'stroke-destructive',
      classeFill: 'fill-destructive',
    },
  ]

  const seriesReceitaPorCategoria: SerieGraficoLinha[] = CATEGORIAS_ENTRADA_TESOURARIA.map((cat, indice) => ({
    id: cat.value,
    label: cat.label,
    valores: controlesOrdenados.map((c) => {
      const todasReceitas = [...c.entradas, ...receitasDizimoDaCompetencia(c.competencia, todasDevolucoes)]
      return todasReceitas.filter((e) => e.categoria === cat.value).reduce((s, e) => s + e.valor, 0)
    }),
    classeStroke: CLASSES_CATEGORIA[indice % CLASSES_CATEGORIA.length].stroke,
    classeFill: CLASSES_CATEGORIA[indice % CLASSES_CATEGORIA.length].fill,
  }))

  const seriesDespesas: SerieGraficoLinha[] = [
    {
      id: 'despesas',
      label: 'Despesas',
      valores: totaisPorCompetencia.map((t) => t.saidas),
      classeStroke: 'stroke-destructive',
      classeFill: 'fill-destructive',
    },
  ]

  return (
    <div>
      <PageHeader title="Evolução" description="Entradas e saídas mês a mês, desde agosto de 2026." />

      {carregando ? (
        <div className="space-y-6">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : competencias.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Nenhum controle mensal ainda" />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entradas e saídas</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoLinhaMultiSerie competencias={competencias} series={seriesEntradasSaidas} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-success" />
                Receita por categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoLinhaMultiSerie competencias={competencias} series={seriesReceitaPorCategoria} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Despesas por mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoLinhaMultiSerie competencias={competencias} series={seriesDespesas} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
