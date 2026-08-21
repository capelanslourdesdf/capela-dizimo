import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowLeftRight,
  Cake,
  CalendarCheck,
  IdCard,
  Pencil,
  Phone,
  Trash2,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatCard } from '@/components/dashboard/StatCard'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { MesesGrid } from '@/components/dashboard/MesesGrid'
import { DevolucoesAgrupadas } from '@/components/dashboard/DevolucoesAgrupadas'
import { RecadastramentoForm } from '@/components/forms/RecadastramentoForm'
import { DevolucaoForm } from '@/components/forms/DevolucaoForm'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

import {
  buscarDizimistaPorCarne,
  diaMesDoRegistro,
  excluirDizimista,
  salvarRecadastramento,
} from '@/services/dizimistaService'
import { obterMinimoMesesAtivos } from '@/services/configuracaoService'
import {
  atualizarDevolucao,
  lancarDevolucao,
  listarDevolucoes,
  type DadosDevolucao,
} from '@/services/devolucaoService'
import type { DadosCadastraisDizimista, Devolucao, Dizimista } from '@/types'
import {
  formatCurrency,
  formatCompetencia,
  formatDate,
  competenciaAtual,
  competenciasEntre,
  getIniciais,
} from '@/utils/format'
import {
  calcularStatusDizimista,
  competenciaDeRegistro,
  competenciasPagasDoDizimista,
  MINIMO_MESES_ATIVOS_PADRAO,
} from '@/utils/statusDizimista'
import { ROUTES } from '@/constants/routes'
import { COMPETENCIA_INICIAL_TESOURARIA } from '@/constants/tesouraria'
import { useDefinirPageTitle } from '@/hooks/usePageTitle'

interface FichaItemProps {
  icon: LucideIcon
  rotulo: string
  valor?: string
}

/** Um campo do cadastro no cabeçalho do perfil. Sem valor preenchido, mostra um traço. */
function FichaItem({ icon: Icon, rotulo, valor }: FichaItemProps) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{rotulo}</dt>
        <dd className="break-words text-sm font-medium text-foreground">{valor?.trim() || '—'}</dd>
      </div>
    </div>
  )
}

export function DizimistaDetalhePage() {
  const { numeroCarne } = useParams<{ numeroCarne: string }>()
  const navigate = useNavigate()
  const [dizimista, setDizimista] = React.useState<Dizimista | null>(null)
  const [devolucoes, setDevolucoes] = React.useState<Devolucao[]>([])
  const [minimoMesesAtivos, setMinimoMesesAtivos] = React.useState(MINIMO_MESES_ATIVOS_PADRAO)
  const [carregando, setCarregando] = React.useState(true)
  const [modalEdicao, setModalEdicao] = React.useState(false)
  const [modalDevolucao, setModalDevolucao] = React.useState(false)
  const [devolucaoEmEdicao, setDevolucaoEmEdicao] = React.useState<Devolucao | null>(null)
  const [modalExclusao, setModalExclusao] = React.useState(false)

  useDefinirPageTitle(dizimista?.nomeCompleto || 'Dizimista')

  const carregar = React.useCallback(async () => {
    if (!numeroCarne) return
    setCarregando(true)
    const [d, dev, minimo] = await Promise.all([
      buscarDizimistaPorCarne(numeroCarne),
      listarDevolucoes(numeroCarne),
      obterMinimoMesesAtivos(),
    ])
    setDizimista(d)
    setDevolucoes(dev)
    setMinimoMesesAtivos(minimo)
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

  async function handleAtualizarDevolucao(dados: DadosDevolucao) {
    if (!numeroCarne || !devolucaoEmEdicao) return
    await atualizarDevolucao(numeroCarne, devolucaoEmEdicao.id, dados)
    setDevolucaoEmEdicao(null)
    toast.success('Devolução atualizada com sucesso.')
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

  // Nem todo registro tem a data completa: os importados da planilha antiga trazem só o dia/mês.
  // Exibe o que houver, para a Pastoral enxergar o que ainda falta preencher.
  const nascimentoExibido = dizimista.dataNascimento
    ? formatDate(dizimista.dataNascimento)
    : diaMesDoRegistro(dizimista)

  const registro = competenciaDeRegistro(dizimista)
  const competenciasPagas = competenciasPagasDoDizimista(devolucoes)
  const status = calcularStatusDizimista(registro, competenciasPagas, minimoMesesAtivos)
  const totalDevolvido = devolucoes.reduce((soma, d) => soma + d.valor, 0)

  const anoAtual = new Date().getFullYear()
  const inicioAno = `${anoAtual}-01`
  const fimAno = `${anoAtual}-12`

  // "Devolvidos" conta qualquer devolução do ano, mesmo lançada pra um mês anterior ao
  // recadastramento (ex.: lançamento retroativo em lote) — mesmo critério do MesesGrid, senão a
  // devolução aparece lá mas não entra nessa contagem. "Pendentes" conta a partir do início do
  // acompanhamento no site (agosto de 2026) — meses antes do recadastramento pessoal de quem já
  // era dizimista antes contam normalmente, só não tem como cobrar antes do site existir.
  const mesesDevolvidosNoAno = competenciasEntre(inicioAno, fimAno).filter((c) => competenciasPagas.has(c)).length

  const inicioContagemPendente = inicioAno > COMPETENCIA_INICIAL_TESOURARIA ? inicioAno : COMPETENCIA_INICIAL_TESOURARIA
  const mesesAplicaveisPendente = competenciasEntre(inicioContagemPendente, competenciaAtual())
  const mesesPendentesNoAno = mesesAplicaveisPendente.filter((c) => !competenciasPagas.has(c)).length

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate(ROUTES.pastoral.root)}>
        <ArrowLeft className="h-4 w-4" />
        Voltar para dizimistas
      </Button>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarFallback className="text-xl">{getIniciais(dizimista.nomeCompleto)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {/* No celular o topo fixo já mostra o nome (ver AppTopbar) — não repete aqui. */}
                <h1 className="hidden text-lg font-semibold text-foreground lg:block lg:text-xl">
                  {dizimista.nomeCompleto}
                </h1>
                <StatusBadge label={status === 'ativo' ? 'Ativo' : 'Inativo'} variant={status === 'ativo' ? 'success' : 'muted'} />
              </div>
            </div>
          </div>

          {/* Ficha completa do cadastro, para a Pastoral conferir tudo sem abrir o formulário. */}
          <dl className="grid gap-3 sm:grid-cols-3">
            <FichaItem icon={IdCard} rotulo="Nº do carnê" valor={dizimista.numeroCarne} />
            <FichaItem icon={Cake} rotulo="Data de nascimento" valor={nascimentoExibido} />
            <FichaItem icon={Phone} rotulo="Telefone" valor={dizimista.telefone} />
          </dl>

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
              Lançar devolução
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* `compact` some com o ícone no mobile: sem ele "R$ 1.234,56" e "Agosto de 2026" cabem em uma linha. */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          compact
          label="Dizimista desde"
          value={registro ? formatCompetencia(registro) : '—'}
          icon={CalendarCheck}
        />
        <StatCard compact label="Total devolvido" value={formatCurrency(totalDevolvido)} icon={Wallet} />
        <StatCard
          compact
          label={`Meses devolvidos em ${anoAtual}`}
          value={String(mesesDevolvidosNoAno)}
          icon={ArrowLeftRight}
        />
        <StatCard
          compact
          label={`Meses pendentes em ${anoAtual}`}
          value={String(mesesPendentesNoAno)}
          icon={CalendarCheck}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Meses de {anoAtual}</CardTitle>
          <CardDescription>Situação mês a mês das devoluções do dízimo.</CardDescription>
        </CardHeader>
        <CardContent>
          <MesesGrid ano={anoAtual} competenciasPagas={competenciasPagas} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Devoluções lançadas</CardTitle>
          <CardDescription>Agrupadas por mês</CardDescription>
        </CardHeader>
        <CardContent>
          <DevolucoesAgrupadas
            devolucoes={devolucoes}
            vazioTitulo="Nenhuma devolução lançada"
            onEditar={setDevolucaoEmEdicao}
          />
        </CardContent>
      </Card>

      <Dialog open={modalEdicao} onOpenChange={setModalEdicao}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar dizimista</DialogTitle>
          </DialogHeader>
          <RecadastramentoForm dizimista={dizimista} bloquearCarne camposOpcionais onSalvar={handleSalvarEdicao} />
        </DialogContent>
      </Dialog>

      <Dialog open={modalDevolucao} onOpenChange={setModalDevolucao}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançar devolução</DialogTitle>
          </DialogHeader>
          <DevolucaoForm onSalvar={handleLancarDevolucao} onCancelar={() => setModalDevolucao(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!devolucaoEmEdicao} onOpenChange={(open) => !open && setDevolucaoEmEdicao(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar devolução</DialogTitle>
          </DialogHeader>
          {devolucaoEmEdicao && (
            <DevolucaoForm
              key={devolucaoEmEdicao.id}
              devolucao={devolucaoEmEdicao}
              onSalvar={handleAtualizarDevolucao}
              onCancelar={() => setDevolucaoEmEdicao(null)}
            />
          )}
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
