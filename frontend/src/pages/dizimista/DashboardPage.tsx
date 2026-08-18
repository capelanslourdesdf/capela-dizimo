import * as React from 'react'
import { AlertCircle, CalendarCheck, CheckCircle2, IdCard, Wallet } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { MesesGrid } from '@/components/dashboard/MesesGrid'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { useDizimistaSessao } from '@/hooks/useDizimistaSessao'
import { competenciaDaDevolucao, listarDevolucoes } from '@/services/devolucaoService'
import type { Devolucao } from '@/types'
import { competenciaAtual, competenciasEntre, formatCompetencia, formatCurrency, formatDate } from '@/utils/format'
import { competenciaDeRegistro } from '@/utils/statusDizimista'

export function DizimistaDashboardPage() {
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

  const registro = dizimista ? competenciaDeRegistro(dizimista) : ''
  const totalDevolvido = devolucoes.reduce((soma, d) => soma + d.valor, 0)
  const competenciasPagas = React.useMemo(() => new Set(devolucoes.map(competenciaDaDevolucao)), [devolucoes])

  const pendentes = React.useMemo(() => {
    if (!registro) return [] as string[]
    return competenciasEntre(registro, competenciaAtual()).filter((c) => !competenciasPagas.has(c))
  }, [registro, competenciasPagas])

  const anoAtual = new Date().getFullYear()

  return (
    <div>
      <PageHeader
        title={`Olá, ${dizimista?.nomeCompleto.split(' ')[0] || 'dizimista'}`}
        description="Acompanhe suas devoluções do dízimo."
      />

      {carregando ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Nº do carnê" value={numeroCarne || '—'} icon={IdCard} />
          <StatCard label="Total devolvido" value={formatCurrency(totalDevolvido)} icon={Wallet} />
          <StatCard
            label="Meses pendentes"
            value={String(pendentes.length)}
            icon={pendentes.length > 0 ? AlertCircle : CheckCircle2}
            helper={pendentes.length === 0 ? 'Tudo em dia' : undefined}
          />
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Meses de {anoAtual}
          </CardTitle>
          <CardDescription>
            {registro
              ? `Contados a partir do seu registro no Meu Dízimo Digital, em ${formatCompetencia(registro)}.`
              : 'Faça seu recadastramento para começarmos a acompanhar suas devoluções.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <MesesGrid ano={anoAtual} registro={registro} competenciasPagas={competenciasPagas} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">Devoluções registradas</CardTitle>
          <CardDescription>Lançamentos feitos pela Pastoral do Dízimo.</CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : devolucoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma devolução registrada até o momento.</p>
          ) : (
            <ul className="divide-y divide-border">
              {devolucoes.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{formatCurrency(d.valor)}</p>
                    <p className="text-xs text-muted-foreground">
                      Referente a {formatCompetencia(competenciaDaDevolucao(d))}
                      {d.lancadoPor ? ` · lançado por ${d.lancadoPor}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(d.criadoEm.slice(0, 10))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
