import * as React from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { MesesGrid } from '@/components/dashboard/MesesGrid'
import { DevolucoesAgrupadas } from '@/components/dashboard/DevolucoesAgrupadas'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { useDizimistaSessao } from '@/hooks/useDizimistaSessao'
import { competenciaDaDevolucao, listarDevolucoes } from '@/services/devolucaoService'
import type { Devolucao } from '@/types'

export function DizimistaDevolucoesPage() {
  const { numeroCarne } = useDizimistaSessao()
  const [devolucoes, setDevolucoes] = React.useState<Devolucao[]>([])
  const [carregando, setCarregando] = React.useState(true)

  React.useEffect(() => {
    if (!numeroCarne) return
    listarDevolucoes(numeroCarne).then((dados) => {
      setDevolucoes(dados)
      setCarregando(false)
    })
  }, [numeroCarne])

  const anoAtual = new Date().getFullYear()
  const competenciasPagas = React.useMemo(() => new Set(devolucoes.map(competenciaDaDevolucao)), [devolucoes])

  return (
    <div>
      <PageHeader title="Minhas devoluções" description="Situação mês a mês e histórico de lançamentos." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{anoAtual}</CardTitle>
          <CardDescription>Meses do ano e a situação de cada um.</CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <MesesGrid ano={anoAtual} competenciasPagas={competenciasPagas} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico</CardTitle>
          <CardDescription>
            Agrupado por mês — se você devolveu mais de uma vez no mesmo mês, todas aparecem juntas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <DevolucoesAgrupadas devolucoes={devolucoes} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
