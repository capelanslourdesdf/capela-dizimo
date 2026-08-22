import * as React from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeftRight, CalendarCheck, CheckCircle2, IdCard, Sparkles, Wallet } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { MesesGrid } from '@/components/dashboard/MesesGrid'
import { DevolucoesAgrupadas } from '@/components/dashboard/DevolucoesAgrupadas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { useDizimistaSessao } from '@/hooks/useDizimistaSessao'
import { competenciaDaDevolucao, listarDevolucoes } from '@/services/devolucaoService'
import type { Devolucao } from '@/types'
import { competenciaAtual, competenciasEntre, formatarNumeroCarne, formatCompetencia, formatCurrency } from '@/utils/format'
import { calcularMesesConsecutivos, calcularStatusDizimista, competenciaDeRegistro } from '@/utils/statusDizimista'
import { sortearMensagemMotivacional, type SegmentoMotivacional } from '@/constants/mensagensMotivacionais'
import { ROUTES } from '@/constants/routes'

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

  // Sorteia uma mensagem por visita (não a cada re-render) — assim que os dados terminam de
  // carregar, escolhe uma vez e não muda mais enquanto a pessoa estiver na tela.
  const [mensagemMotivacional, setMensagemMotivacional] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (carregando) return
    const status = calcularStatusDizimista(registro, competenciasPagas)
    const segmento: SegmentoMotivacional = devolucoes.length === 0 ? 'nunca' : status === 'ativo' ? 'regular' : 'irregular'
    setMensagemMotivacional(sortearMensagemMotivacional(segmento, calcularMesesConsecutivos(competenciasPagas)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando])

  const anoAtual = new Date().getFullYear()
  const inicioAno = `${anoAtual}-01`

  // Todos os meses do ano atual, de janeiro até o mês atual — nunca meses futuros. Sem exceção
  // pra quem se registrou depois de janeiro: o ano inteiro conta.
  const pendentes = React.useMemo(() => {
    return competenciasEntre(inicioAno, competenciaAtual()).filter((c) => !competenciasPagas.has(c))
  }, [inicioAno, competenciasPagas])

  return (
    <div>
      <PageHeader
        title={`Olá, ${dizimista?.nomeCompleto.split(' ')[0] || 'dizimista'}`}
        description="Acompanhe suas devoluções do dízimo."
        topTitle="Início"
        actions={
          <Button asChild size="lg" className="w-full text-base sm:w-auto">
            <Link to={ROUTES.dizimista.fazerDevolucao}>
              <ArrowLeftRight className="h-5 w-5" />
              Devolver meu dízimo
            </Link>
          </Button>
        }
      />

      {mensagemMotivacional && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3.5 text-sm font-medium text-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>{mensagemMotivacional}</p>
        </div>
      )}

      {carregando ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Nº do carnê" value={numeroCarne ? formatarNumeroCarne(numeroCarne) : '—'} icon={IdCard} />
          <StatCard label="Total devolvido" value={formatCurrency(totalDevolvido)} icon={Wallet} />
          <StatCard
            label="Meses pendentes"
            value={String(pendentes.length)}
            icon={pendentes.length > 0 ? AlertCircle : CheckCircle2}
            helper={pendentes.length === 0 ? 'Tudo em dia' : `A partir de ${formatCompetencia(inicioAno)}`}
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
              : devolucoes.length > 0
                ? 'Todo o seu histórico de devoluções.'
                : 'Faça seu recadastramento para começarmos a acompanhar suas devoluções.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <MesesGrid ano={anoAtual} competenciasPagas={competenciasPagas} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">Devoluções registradas</CardTitle>
          <CardDescription>
            Agrupadas por mês — se você devolveu mais de uma vez no mesmo mês, todas aparecem juntas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <DevolucoesAgrupadas devolucoes={devolucoes} vazioTitulo="Nenhuma devolução registrada até o momento" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
