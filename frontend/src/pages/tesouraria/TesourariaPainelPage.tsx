import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ArrowRight, TrendingDown, TrendingUp, Wallet } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

import { listarControlesTesouraria, receitasDizimoDaCompetencia } from '@/services/tesourariaService'
import { listarTodasDevolucoesPorCarne } from '@/services/devolucaoService'
import type { ControleTesouraria, Devolucao } from '@/types'
import { COMPETENCIA_INICIAL_TESOURARIA, STATUS_CONTROLE_TESOURARIA } from '@/constants/tesouraria'
import { formatCompetencia, formatCurrency } from '@/utils/format'
import { ROUTES } from '@/constants/routes'
import { useTesourariaSessao } from '@/hooks/useTesourariaSessao'

export function TesourariaPainelPage() {
  const navigate = useNavigate()
  const { podeEditar } = useTesourariaSessao()
  const [controles, setControles] = React.useState<ControleTesouraria[]>([])
  const [todasDevolucoes, setTodasDevolucoes] = React.useState<Devolucao[]>([])
  const [carregando, setCarregando] = React.useState(true)
  const [competenciaSelecionada, setCompetenciaSelecionada] = React.useState('')

  React.useEffect(() => {
    // A Tesouraria nunca olha pra devolução anterior ao início do controle dela — não precisa
    // ler o histórico de antes disso.
    Promise.all([listarControlesTesouraria(), listarTodasDevolucoesPorCarne(COMPETENCIA_INICIAL_TESOURARIA)])
      .then(([lista, porCarne]) => {
        setControles(lista)
        setTodasDevolucoes(Object.values(porCarne).flat())
        // A lista já vem do mais recente pro mais antigo — o mais recente é o padrão exibido.
        if (lista.length > 0) setCompetenciaSelecionada(lista[0].competencia)
      })
      .finally(() => setCarregando(false))
  }, [])

  const controleSelecionado = controles.find((c) => c.competencia === competenciaSelecionada) ?? null
  const receitasDizimoSelecionada = competenciaSelecionada
    ? receitasDizimoDaCompetencia(competenciaSelecionada, todasDevolucoes)
    : []
  const receitaSelecionada =
    (controleSelecionado ? controleSelecionado.entradas.reduce((s, e) => s + e.valor, 0) : 0) +
    receitasDizimoSelecionada.reduce((s, e) => s + e.valor, 0)
  const despesaSelecionada = controleSelecionado ? controleSelecionado.saidas.reduce((s, sa) => s + sa.valor, 0) : 0
  const saldoSelecionado = receitaSelecionada - despesaSelecionada

  return (
    <div>
      <PageHeader title="Tesouraria" description="Balancete mensal da Capela, mês a mês desde agosto de 2026." />

      {carregando ? (
        <Skeleton className="mb-6 h-72 w-full rounded-xl" />
      ) : controles.length === 0 ? null : (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Balancete do mês</CardTitle>
              <Select value={competenciaSelecionada} onValueChange={setCompetenciaSelecionada}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {controles.map((c) => (
                    <SelectItem key={c.competencia} value={c.competencia}>
                      {formatCompetencia(c.competencia)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {controleSelecionado && (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={STATUS_CONTROLE_TESOURARIA[controleSelecionado.status]}
                    variant={controleSelecionado.status === 'fechado' ? 'muted' : 'success'}
                  />
                </div>
                <div className="mb-4 grid grid-cols-3 gap-3 lg:gap-4">
                  <StatCard compact tom="success" label="Total em receita" value={formatCurrency(receitaSelecionada)} icon={TrendingUp} />
                  <StatCard compact tom="destructive" label="Total em despesas" value={formatCurrency(despesaSelecionada)} icon={TrendingDown} />
                  <StatCard compact label="Saldo total" value={formatCurrency(saldoSelecionado)} icon={Wallet} />
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate(ROUTES.pastoral.tesouraria.controle(controleSelecionado.competencia))}
                >
                  {podeEditar ? 'Gerenciar lançamentos deste mês' : 'Ver lançamentos deste mês'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos os meses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {carregando ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : (
            controles.map((c) => {
              const entradasMes =
                c.entradas.reduce((s, e) => s + e.valor, 0) +
                receitasDizimoDaCompetencia(c.competencia, todasDevolucoes).reduce((s, e) => s + e.valor, 0)
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
                    <span>Receita: {formatCurrency(entradasMes)}</span>
                    <span>Despesas: {formatCurrency(saidasMes)}</span>
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
