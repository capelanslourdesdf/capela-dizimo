import * as React from 'react'
import { ArrowLeftRight } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { MesesGrid } from '@/components/dashboard/MesesGrid'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { useDizimistaSessao } from '@/hooks/useDizimistaSessao'
import { competenciaDaDevolucao, listarDevolucoes } from '@/services/devolucaoService'
import type { Devolucao } from '@/types'
import { formatCurrency, formatDate, formatCompetencia } from '@/utils/format'
import { formaPagamentoLabel } from '@/constants/devolucao'
import { competenciaDeRegistro } from '@/utils/statusDizimista'

export function DizimistaDevolucoesPage() {
  const { numeroCarne, dizimista } = useDizimistaSessao()
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
  const registro = dizimista ? competenciaDeRegistro(dizimista) : ''
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
            <MesesGrid ano={anoAtual} registro={registro} competenciasPagas={competenciasPagas} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : devolucoes.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="Nenhuma devolução registrada" />
          ) : (
            <div className="space-y-2.5">
              {devolucoes.map((d) => (
                <Card key={d.id}>
                  <CardContent className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{formatCurrency(d.valor)}</p>
                      <p className="text-xs text-muted-foreground">
                        Referente a {formatCompetencia(competenciaDaDevolucao(d))} · {formaPagamentoLabel(d.formaPagamento)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Lançado em {formatDate(d.criadoEm.slice(0, 10))}
                        {d.lancadoPor ? ` por ${d.lancadoPor}` : ''}
                      </p>
                      {d.observacao && <p className="mt-1 text-xs text-muted-foreground">{d.observacao}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
