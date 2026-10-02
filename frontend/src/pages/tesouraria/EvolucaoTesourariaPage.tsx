import * as React from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { GraficoEntradasSaidas } from '@/components/dashboard/GraficoEntradasSaidas'
import { GraficoReceitaPorCategoria } from '@/components/dashboard/GraficoReceitaPorCategoria'
import { GraficoBarraPorMes } from '@/components/dashboard/GraficoBarraPorMes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { listarControlesTesouraria, receitasDizimoDaCompetencia } from '@/services/tesourariaService'
import { listarTodasDevolucoesPorCarne } from '@/services/devolucaoService'
import type { ControleTesouraria, Devolucao } from '@/types'
import { CATEGORIAS_ENTRADA_TESOURARIA, COMPETENCIA_INICIAL_TESOURARIA } from '@/constants/tesouraria'

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

  const dadosGrafico = React.useMemo(
    () =>
      controlesOrdenados.map((c) => ({
        competencia: c.competencia,
        entradas:
          c.entradas.reduce((s, e) => s + e.valor, 0) +
          receitasDizimoDaCompetencia(c.competencia, todasDevolucoes).reduce((s, e) => s + e.valor, 0),
        saidas: c.saidas.reduce((s, sa) => s + sa.valor, 0),
      })),
    [controlesOrdenados, todasDevolucoes],
  )

  const dadosReceitaPorCategoria = React.useMemo(
    () =>
      controlesOrdenados.map((c) => {
        const todasReceitas = [...c.entradas, ...receitasDizimoDaCompetencia(c.competencia, todasDevolucoes)]
        const porCategoria: Record<string, number> = {}
        for (const cat of CATEGORIAS_ENTRADA_TESOURARIA) {
          porCategoria[cat.value] = todasReceitas
            .filter((e) => e.categoria === cat.value)
            .reduce((s, e) => s + e.valor, 0)
        }
        return { competencia: c.competencia, porCategoria }
      }),
    [controlesOrdenados, todasDevolucoes],
  )

  const dadosDespesasPorMes = React.useMemo(
    () => dadosGrafico.map((d) => ({ competencia: d.competencia, valor: d.saidas })),
    [dadosGrafico],
  )

  return (
    <div>
      <PageHeader title="Evolução" description="Entradas e saídas mês a mês, desde agosto de 2026." />

      {carregando ? (
        <div className="space-y-6">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : dadosGrafico.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Nenhum controle mensal ainda" />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <GraficoEntradasSaidas dados={dadosGrafico} />
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
              <GraficoReceitaPorCategoria dados={dadosReceitaPorCategoria} categorias={CATEGORIAS_ENTRADA_TESOURARIA} />
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
              <GraficoBarraPorMes dados={dadosDespesasPorMes} tom="destructive" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
