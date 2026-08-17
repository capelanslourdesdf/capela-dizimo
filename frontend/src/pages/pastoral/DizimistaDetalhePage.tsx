import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowLeftRight,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  Trash2,
  User,
  UsersRound,
} from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { RecadastramentoForm } from '@/components/forms/RecadastramentoForm'
import { DevolucaoForm } from '@/components/forms/DevolucaoForm'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

import { buscarDizimistaPorCarne, excluirDizimista, salvarRecadastramento } from '@/services/dizimistaService'
import { listarPagamentos } from '@/services/pagamentoService'
import {
  competenciaDaDevolucao,
  lancarDevolucao,
  listarDevolucoes,
  type DadosDevolucao,
} from '@/services/devolucaoService'
import type {
  DadosCadastraisDizimista,
  Devolucao,
  Dizimista,
  Endereco,
  PagamentoPix,
  StatusPagamento,
} from '@/types'
import { formatCurrency, formatDate, formatCompetencia, getIniciais } from '@/utils/format'
import { formaPagamentoLabel } from '@/constants/devolucao'
import { ROUTES } from '@/constants/routes'

/** Monta o endereço em uma linha, pulando as partes que não foram preenchidas. */
function formatarEndereco(endereco: Endereco): string {
  const logradouroComNumero = [endereco.logradouro, endereco.numero].filter(Boolean).join(', ')
  const cidadeUf = [endereco.cidade, endereco.estado].filter(Boolean).join('/')

  const partes = [logradouroComNumero, endereco.complemento, endereco.bairro, cidadeUf, endereco.cep]
  const texto = partes.filter((parte) => !!parte?.trim()).join(' · ')

  return texto || 'Endereço não informado'
}

const STATUS_CONFIG: Record<StatusPagamento, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  aprovado: { label: 'Pago', variant: 'success' },
  pendente: { label: 'Pendente', variant: 'warning' },
  rejeitado: { label: 'Não aprovado', variant: 'destructive' },
}

export function DizimistaDetalhePage() {
  const { numeroCarne } = useParams<{ numeroCarne: string }>()
  const navigate = useNavigate()
  const [dizimista, setDizimista] = React.useState<Dizimista | null>(null)
  const [pagamentos, setPagamentos] = React.useState<PagamentoPix[]>([])
  const [devolucoes, setDevolucoes] = React.useState<Devolucao[]>([])
  const [carregando, setCarregando] = React.useState(true)
  const [modalEdicao, setModalEdicao] = React.useState(false)
  const [modalDevolucao, setModalDevolucao] = React.useState(false)
  const [modalExclusao, setModalExclusao] = React.useState(false)

  const carregar = React.useCallback(async () => {
    if (!numeroCarne) return
    setCarregando(true)
    const [d, p, dev] = await Promise.all([
      buscarDizimistaPorCarne(numeroCarne),
      listarPagamentos(numeroCarne),
      listarDevolucoes(numeroCarne),
    ])
    setDizimista(d)
    setPagamentos(p)
    setDevolucoes(dev)
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

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate(ROUTES.pastoral.root)}>
        <ArrowLeft className="h-4 w-4" />
        Voltar para dizimistas
      </Button>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl">{getIniciais(dizimista.nomeCompleto)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-semibold text-foreground sm:text-xl">{dizimista.nomeCompleto}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Carnê nº {dizimista.numeroCarne}</p>
              {dizimista.email && (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {dizimista.email}
                </p>
              )}
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {dizimista.telefone}
              </p>
              <p className="mt-0.5 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{formatarEndereco(dizimista.endereco)}</span>
              </p>
              {dizimista.responsavelRecadastramento && (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  Recadastrado por {dizimista.responsavelRecadastramento}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setModalEdicao(true)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button onClick={() => setModalDevolucao(true)}>
              <ArrowLeftRight className="h-4 w-4" />
              Lançar devolução
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setModalExclusao(true)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pagamentos">
        <TabsList>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="devolucoes">Devoluções</TabsTrigger>
          <TabsTrigger value="familia">Família</TabsTrigger>
        </TabsList>

        <TabsContent value="pagamentos">
          {pagamentos.length === 0 ? (
            <EmptyState icon={Receipt} title="Nenhum pagamento registrado" />
          ) : (
            <div className="space-y-2.5">
              {pagamentos.map((p) => {
                const status = STATUS_CONFIG[p.status]
                return (
                  <Card key={p.id}>
                    <CardContent className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{formatCurrency(p.valor)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCompetencia(p.competencia)} · {formatDate(p.criadoEm)}
                        </p>
                      </div>
                      <StatusBadge label={status.label} variant={status.variant} />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="devolucoes">
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
        </TabsContent>

        <TabsContent value="familia">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cônjuge e filhos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!dizimista.conjuge && dizimista.filhos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum familiar cadastrado.</p>
              ) : (
                <>
                  {dizimista.conjuge && (
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Cônjuge</p>
                      <Badge variant="outline" className="mt-1">
                        {dizimista.conjuge.nomeCompleto}
                      </Badge>
                    </div>
                  )}
                  {dizimista.filhos.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Filhos</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {dizimista.filhos.map((f, i) => (
                          <Badge key={i} variant="outline">
                            {f.nomeCompleto}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
