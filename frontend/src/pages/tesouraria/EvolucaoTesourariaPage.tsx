import * as React from 'react'
import { TrendingUp } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { GraficoEntradasSaidas } from '@/components/dashboard/GraficoEntradasSaidas'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { listarControlesTesouraria, receitasDizimoDaCompetencia } from '@/services/tesourariaService'
import { listarTodasDevolucoesPorCarne } from '@/services/devolucaoService'
import type { ControleTesouraria, Devolucao } from '@/types'
import { COMPETENCIA_INICIAL_TESOURARIA } from '@/constants/tesouraria'

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

  const dadosGrafico = React.useMemo(
    () =>
      [...controles]
        .sort((a, b) => (a.competencia > b.competencia ? 1 : -1))
        .map((c) => ({
          competencia: c.competencia,
          entradas:
            c.entradas.reduce((s, e) => s + e.valor, 0) +
            receitasDizimoDaCompetencia(c.competencia, todasDevolucoes).reduce((s, e) => s + e.valor, 0),
          saidas: c.saidas.reduce((s, sa) => s + sa.valor, 0),
        })),
    [controles, todasDevolucoes],
  )

  return (
    <div>
      <PageHeader title="Evolução" description="Entradas e saídas mês a mês, desde agosto de 2026." />

      {carregando ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : dadosGrafico.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Nenhum controle mensal ainda" />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <GraficoEntradasSaidas dados={dadosGrafico} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
