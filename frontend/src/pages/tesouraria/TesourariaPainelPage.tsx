import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, CalendarRange, TrendingDown, TrendingUp, Wallet } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { GraficoEntradasSaidas } from '@/components/dashboard/GraficoEntradasSaidas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { listarControlesTesouraria } from '@/services/tesourariaService'
import type { ControleTesouraria } from '@/types'
import { CATEGORIAS_ENTRADA_TESOURARIA, STATUS_CONTROLE_TESOURARIA } from '@/constants/tesouraria'
import { formatCompetencia, formatCurrency } from '@/utils/format'
import { ROUTES } from '@/constants/routes'

export function TesourariaPainelPage() {
  const navigate = useNavigate()
  const [controles, setControles] = React.useState<ControleTesouraria[]>([])
  const [carregando, setCarregando] = React.useState(true)

  React.useEffect(() => {
    listarControlesTesouraria()
      .then(setControles)
      .finally(() => setCarregando(false))
  }, [])

  const totalEntradas = React.useMemo(
    () => controles.reduce((soma, c) => soma + c.entradas.reduce((s, e) => s + e.valor, 0), 0),
    [controles],
  )
  const totalSaidas = React.useMemo(
    () => controles.reduce((soma, c) => soma + c.saidas.reduce((s, sa) => s + sa.valor, 0), 0),
    [controles],
  )
  const saldo = totalEntradas - totalSaidas

  const totaisPorCategoria = React.useMemo(() => {
    return CATEGORIAS_ENTRADA_TESOURARIA.map((cat) => ({
      label: cat.label,
      total: controles.reduce(
        (soma, c) => soma + c.entradas.filter((e) => e.categoria === cat.value).reduce((s, e) => s + e.valor, 0),
        0,
      ),
    }))
  }, [controles])

  const dadosGrafico = React.useMemo(
    () =>
      [...controles]
        .sort((a, b) => (a.competencia > b.competencia ? 1 : -1))
        .map((c) => ({
          competencia: c.competencia,
          entradas: c.entradas.reduce((s, e) => s + e.valor, 0),
          saidas: c.saidas.reduce((s, sa) => s + sa.valor, 0),
        })),
    [controles],
  )

  return (
    <div>
      <PageHeader title="Tesouraria" description="Visão geral da tesouraria da Capela, mês a mês desde agosto de 2026." />

      {carregando ? (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total arrecadado" value={formatCurrency(totalEntradas)} icon={TrendingUp} />
          <StatCard label="Total de saídas" value={formatCurrency(totalSaidas)} icon={TrendingDown} />
          <StatCard label="Saldo geral" value={formatCurrency(saldo)} icon={Wallet} />
          <StatCard label="Meses controlados" value={String(controles.length)} icon={CalendarRange} />
        </div>
      )}

      {!carregando && dadosGrafico.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Evolução de entradas e saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoEntradasSaidas dados={dadosGrafico} />
          </CardContent>
        </Card>
      )}

      {!carregando && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Totais por categoria de entrada</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {totaisPorCategoria.map((c) => (
                <li key={c.label} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium text-foreground">{c.label}</span>
                  <span className="text-foreground">{formatCurrency(c.total)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Controles mensais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {carregando ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : (
            controles.map((c) => {
              const entradasMes = c.entradas.reduce((s, e) => s + e.valor, 0)
              const saidasMes = c.saidas.reduce((s, sa) => s + sa.valor, 0)
              return (
                <button
                  key={c.competencia}
                  type="button"
                  onClick={() => navigate(ROUTES.pastoral.tesouraria.controle(c.competencia))}
                  className="flex w-full flex-col gap-2 rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-accent sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium text-foreground">{formatCompetencia(c.competencia)}</span>
                    <StatusBadge
                      label={STATUS_CONTROLE_TESOURARIA[c.status]}
                      variant={c.status === 'fechado' ? 'muted' : 'success'}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                    <span>Entradas: {formatCurrency(entradasMes)}</span>
                    <span>Saídas: {formatCurrency(saidasMes)}</span>
                    <span className="font-medium text-foreground">Saldo: {formatCurrency(entradasMes - saidasMes)}</span>
                  </div>
                </button>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
