import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight, CalendarCheck, Pencil, Phone, Trash2, UsersRound, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatCard } from '@/components/dashboard/StatCard'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { MesesGrid } from '@/components/dashboard/MesesGrid'
import { RecadastramentoForm } from '@/components/forms/RecadastramentoForm'
import { DevolucaoForm } from '@/components/forms/DevolucaoForm'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

import { buscarDizimistaPorCarne, excluirDizimista, salvarRecadastramento } from '@/services/dizimistaService'
import { obterMesesParaInativo } from '@/services/configuracaoService'
import {
  competenciaDaDevolucao,
  lancarDevolucao,
  listarDevolucoes,
  type DadosDevolucao,
} from '@/services/devolucaoService'
import type { DadosCadastraisDizimista, Devolucao, Dizimista } from '@/types'
import { formatCurrency, formatDate, formatCompetencia, competenciaAtual, competenciasEntre, getIniciais } from '@/utils/format'
import { calcularStatusDizimista, competenciaDeRegistro, competenciasPagasDoDizimista } from '@/utils/statusDizimista'
import { formaPagamentoLabel } from '@/constants/devolucao'
import { ROUTES } from '@/constants/routes'

export function DizimistaDetalhePage() {
  const { numeroCarne } = useParams<{ numeroCarne: string }>()
  const navigate = useNavigate()
  const [dizimista, setDizimista] = React.useState<Dizimista | null>(null)
  const [devolucoes, setDevolucoes] = React.useState<Devolucao[]>([])
  const [mesesParaInativo, setMesesParaInativo] = React.useState(5)
  const [carregando, setCarregando] = React.useState(true)
  const [modalEdicao, setModalEdicao] = React.useState(false)
  const [modalDevolucao, setModalDevolucao] = React.useState(false)
  const [modalExclusao, setModalExclusao] = React.useState(false)

  const carregar = React.useCallback(async () => {
    if (!numeroCarne) return
    setCarregando(true)
    const [d, dev, meses] = await Promise.all([
      buscarDizimistaPorCarne(numeroCarne),
      listarDevolucoes(numeroCarne),
      obterMesesParaInativo(),
    ])
    setDizimista(d)
    setDevolucoes(dev)
    setMesesParaInativo(meses)
    setCarregando(false)
  }, [numeroCarne])

  React.useEffect(() => {
    carregar()
  }, [carregar])

  async function handleSalvarEdicao(dados: DadosCadastraisDizimista) {
    if (!numeroCarne) return
    await salvarRecadastramento(numeroCarne, dados)
    setModalEdicao(false)
    toast.success('Dados do dizimista atualizados.')
    carregar()
  }

  async function handleLancarDevolucao(dados: DadosDevolucao) {
    if (!numeroCarne) return
    await lancarDevolucao(numeroCarne, dados)
    setModalDevolucao(false)
    toast.success('Devolução lançada com sucesso.')
    carregar()
  }

  async function handleExcluir() {
    if (!numeroCarne || !dizimista) return
    try {
      await excluirDizimista(numeroCarne)
      toast.success(`${dizimista.nomeCompleto} foi excluído(a).`)
      navigate(ROUTES.pastoral.root)
    } catch {
      toast.error('Não foi possível excluir o dizimista. Tente novamente.')
    }
  }

  if (carregando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!dizimista) {
    return (
      <EmptyState
        icon={UsersRound}
        title="Dizimista não encontrado"
        action={
          <Button asChild variant="outline">
            <Link to={ROUTES.pastoral.root}>Voltar para a lista</Link>
          </Button>
        }
      />
    )
  }

  const registro = competenciaDeRegistro(dizimista)
  const competenciasPagas = competenciasPagasDoDizimista(devolucoes)
  const status = calcularStatusDizimista(registro, competenciasPagas, mesesParaInativo)
  const totalDevolvido = devolucoes.reduce((soma, d) => soma + d.valor, 0)

  const anoAtual = new Date().getFullYear()
  const inicioAno = `${anoAtual}-01`
  const inicioContagemAno = registro && registro > inicioAno ? registro : inicioAno
  const competenciasDoAno = competenciasEntre(inicioContagemAno, competenciaAtual())
  const mesesDevolvidosNoAno = competenciasDoAno.filter((c) => competenciasPagas.has(c)).length
  const mesesPendentesNoAno = competenciasDoAno.length - mesesDevolvidosNoAno

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate(ROUTES.pastoral.root)}>
        <ArrowLeft className="h-4 w-4" />
        Voltar para dizimistas
      </Button>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl">{getIniciais(dizimista.nomeCompleto)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground sm:text-xl">{dizimista.nomeCompleto}</h1>
                <StatusBadge label={status === 'ativo' ? 'Ativo' : 'Inativo'} variant={status === 'ativo' ? 'success' : 'muted'} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Carnê nº {dizimista.numeroCarne}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {dizimista.telefone}
              </p>
            </div>
          </div>

          <div className="flex flex-nowrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setModalExclusao(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Excluir</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setModalEdicao(true)}>
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button size="sm" onClick={() => setModalDevolucao(true)}>
              <ArrowLeftRight className="h-4 w-4" />
              <span className="hidden sm:inline">Lançar devolução</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Dizimista desde"
          value={registro ? formatCompetencia(registro) : '—'}
          icon={CalendarCheck}
        />
        <StatCard label="Total devolvido" value={formatCurrency(totalDevolvido)} icon={Wallet} />
        <StatCard label={`Meses devolvidos em ${anoAtual}`} value={String(mesesDevolvidosNoAno)} icon={ArrowLeftRight} />
        <StatCard label={`Meses pendentes em ${anoAtual}`} value={String(mesesPendentesNoAno)} icon={CalendarCheck} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Meses de {anoAtual}</CardTitle>
          <CardDescription>Situação mês a mês das devoluções do dízimo.</CardDescription>
        </CardHeader>
        <CardContent>
          <MesesGrid ano={anoAtual} registro={registro} competenciasPagas={competenciasPagas} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Devoluções lançadas</CardTitle>
        </CardHeader>
        <CardContent>
          {devolucoes.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="Nenhuma devolução lançada" />
          ) : (
            <div className="space-y-2.5">
              {devolucoes.map((d) => (
                <Card key={d.id}>
                  <CardContent className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{formatCurrency(d.valor)}</p>
                      <p className="text-xs text-muted-foreground">
                        Referente a {formatCompetencia(competenciaDaDevolucao(d))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Lançado em {formatDate(d.criadoEm.slice(0, 10))}
                        {d.lancadoPor ? ` por ${d.lancadoPor}` : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {formaPagamentoLabel(d.formaPagamento)}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalEdicao} onOpenChange={setModalEdicao}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar dizimista</DialogTitle>
          </DialogHeader>
          <RecadastramentoForm dizimista={dizimista} bloquearCarne onSalvar={handleSalvarEdicao} />
        </DialogContent>
      </Dialog>

      <Dialog open={modalDevolucao} onOpenChange={setModalDevolucao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar devolução</DialogTitle>
          </DialogHeader>
          <DevolucaoForm onSalvar={handleLancarDevolucao} onCancelar={() => setModalDevolucao(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={modalExclusao}
        onOpenChange={setModalExclusao}
        title="Excluir dizimista"
        description={`Tem certeza que deseja excluir ${dizimista.nomeCompleto}? O histórico de pagamentos e devoluções também será removido. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={handleExcluir}
      />
    </div>
  )
}
