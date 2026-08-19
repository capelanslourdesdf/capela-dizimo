import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Cake, Download, IdCard, Phone, Trash2, UserPlus, Users, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { FiltroBar } from '@/components/pastoral/FiltroBar'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatCard } from '@/components/dashboard/StatCard'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { RecadastramentoForm } from '@/components/forms/RecadastramentoForm'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

import { criarDizimistaAdmin, diaMesDoRegistro, excluirDizimista, listarDizimistas } from '@/services/dizimistaService'
import { competenciaDaDevolucao, listarTodasDevolucoesPorCarne } from '@/services/devolucaoService'
import { obterMinimoMesesAtivos } from '@/services/configuracaoService'
import type { DadosCadastraisDizimista, Devolucao, Dizimista } from '@/types'
import { formatCurrency, getIniciais } from '@/utils/format'
import { baixarArquivoTexto } from '@/utils/download'
import {
  calcularStatusDizimista,
  competenciaDeRegistro,
  competenciasPagasDoDizimista,
  type StatusDizimista,
} from '@/utils/statusDizimista'
import { ROUTES } from '@/constants/routes'

const STATUS_CONFIG: Record<StatusDizimista, { label: string; variant: 'success' | 'muted' }> = {
  ativo: { label: 'Ativo', variant: 'success' },
  inativo: { label: 'Inativo', variant: 'muted' },
}

export function DizimistasPage() {
  const navigate = useNavigate()
  const [dizimistas, setDizimistas] = React.useState<Dizimista[]>([])
  const [devolucoesPorCarne, setDevolucoesPorCarne] = React.useState<Record<string, Devolucao[]>>({})
  const [minimoMesesAtivos, setMinimoMesesAtivos] = React.useState<number | null>(null)
  const [carregando, setCarregando] = React.useState(true)
  const [busca, setBusca] = React.useState('')
  const [filtroStatus, setFiltroStatus] = React.useState<StatusDizimista | 'todos'>('todos')
  const [modalAberto, setModalAberto] = React.useState(false)
  const [dizimistaParaExcluir, setDizimistaParaExcluir] = React.useState<Dizimista | null>(null)

  const carregar = React.useCallback(async () => {
    setCarregando(true)
    const [todos, devolucoes, minimo] = await Promise.all([
      listarDizimistas(),
      listarTodasDevolucoesPorCarne(),
      obterMinimoMesesAtivos(),
    ])
    setDizimistas(todos)
    setDevolucoesPorCarne(devolucoes)
    setMinimoMesesAtivos(minimo)
    setCarregando(false)
  }, [])

  React.useEffect(() => {
    carregar()
  }, [carregar])

  const statusPorCarne = React.useMemo(() => {
    const mapa = new Map<string, StatusDizimista>()
    if (minimoMesesAtivos === null) return mapa

    for (const d of dizimistas) {
      const devolucoes = devolucoesPorCarne[d.numeroCarne] ?? []
      const status = calcularStatusDizimista(
        competenciaDeRegistro(d),
        competenciasPagasDoDizimista(devolucoes),
        minimoMesesAtivos,
      )
      mapa.set(d.numeroCarne, status)
    }
    return mapa
  }, [dizimistas, devolucoesPorCarne, minimoMesesAtivos])

  const totalAtivos = React.useMemo(
    () => [...statusPorCarne.values()].filter((s) => s === 'ativo').length,
    [statusPorCarne],
  )
  const totalInativos = React.useMemo(
    () => [...statusPorCarne.values()].filter((s) => s === 'inativo').length,
    [statusPorCarne],
  )

  /** Soma de todas as devoluções (de todos os dizimistas) agrupada por ano, do mais recente pro mais antigo. */
  const totalPorAno = React.useMemo(() => {
    const mapa = new Map<string, number>()
    for (const devolucoes of Object.values(devolucoesPorCarne)) {
      for (const d of devolucoes) {
        const ano = competenciaDaDevolucao(d).slice(0, 4)
        if (!ano) continue
        mapa.set(ano, (mapa.get(ano) ?? 0) + d.valor)
      }
    }
    return [...mapa.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [devolucoesPorCarne])

  const anoAtual = String(new Date().getFullYear())
  const totalAnoAtual = totalPorAno.find(([ano]) => ano === anoAtual)?.[1] ?? 0

  /** Dizimistas que fazem aniversário no mês atual, ordenados pelo dia. */
  const aniversariantesDoMes = React.useMemo(() => {
    const mesAtual = String(new Date().getMonth() + 1).padStart(2, '0')

    return dizimistas
      .map((d) => ({ dizimista: d, diaMes: diaMesDoRegistro(d) }))
      .filter(({ diaMes }) => /^\d{2}\/\d{2}$/.test(diaMes) && diaMes.slice(3, 5) === mesAtual)
      .sort((a, b) => Number(a.diaMes.slice(0, 2)) - Number(b.diaMes.slice(0, 2)))
  }, [dizimistas])

  const nomeMesAtual = React.useMemo(() => {
    const nome = new Date().toLocaleDateString('pt-BR', { month: 'long' })
    return nome.charAt(0).toUpperCase() + nome.slice(1)
  }, [])

  const dizimistasFiltrados = React.useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return dizimistas.filter((d) => {
      const combinaBusca =
        !termo || d.nomeCompleto.toLowerCase().includes(termo) || d.numeroCarne.includes(termo)
      const combinaStatus = filtroStatus === 'todos' || statusPorCarne.get(d.numeroCarne) === filtroStatus
      return combinaBusca && combinaStatus
    })
  }, [dizimistas, busca, filtroStatus, statusPorCarne])

  async function handleCadastrar(dados: DadosCadastraisDizimista) {
    const numeroCarne = await criarDizimistaAdmin(dados)
    setModalAberto(false)
    toast.success(`Dizimista cadastrado(a) com o carnê nº ${numeroCarne}.`)
    navigate(ROUTES.pastoral.dizimistaDetalhe(numeroCarne))
  }

  async function handleExcluir() {
    if (!dizimistaParaExcluir) return
    try {
      await excluirDizimista(dizimistaParaExcluir.numeroCarne)
      setDizimistas((atual) => atual.filter((d) => d.numeroCarne !== dizimistaParaExcluir.numeroCarne))
      toast.success(`${dizimistaParaExcluir.nomeCompleto} foi excluído(a).`)
      setDizimistaParaExcluir(null)
    } catch {
      toast.error('Não foi possível excluir o dizimista. Tente novamente.')
    }
  }

  function handleExportarAtivos() {
    const ativos = dizimistas.filter((d) => statusPorCarne.get(d.numeroCarne) === 'ativo')
    if (ativos.length === 0) {
      toast.info('Nenhum dizimista ativo para exportar.')
      return
    }

    const conteudo = ativos.map((d) => d.numeroCarne).join('\n')
    const hoje = new Date().toISOString().slice(0, 10)
    baixarArquivoTexto(`carnes-ativos-${hoje}.txt`, conteudo)
    toast.success(`${ativos.length} carnê(s) exportado(s).`)
  }

  return (
    <div>
      <PageHeader
        title="Dizimistas"
        description={`${dizimistasFiltrados.length} dizimista(s) encontrado(s)`}
        actions={
          <>
            <Button variant="outline" onClick={handleExportarAtivos}>
              <Download className="h-4 w-4" />
              Exportar ativos
            </Button>
            <Button onClick={() => setModalAberto(true)}>
              <UserPlus className="h-4 w-4" />
              Novo dizimista
            </Button>
          </>
        }
      />

      {carregando ? (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Ativos" value={String(totalAtivos)} icon={Users} />
          <StatCard label="Inativos" value={String(totalInativos)} icon={Users} />
          <StatCard label="Total" value={String(dizimistas.length)} icon={Users} />
          <StatCard label={`Arrecadado em ${anoAtual}`} value={formatCurrency(totalAnoAtual)} icon={Wallet} />
        </div>
      )}

      {!carregando && totalPorAno.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Total arrecadado por ano</CardTitle>
            <CardDescription>Soma de todas as devoluções lançadas em cada ano.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {totalPorAno.map(([ano, total]) => (
                <li key={ano} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium text-foreground">{ano}</span>
                  <span className="text-foreground">{formatCurrency(total)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!carregando && (
        <Card className="mb-6">
          <Accordion type="single" collapsible>
            <AccordionItem value="aniversariantes" className="border-b-0">
              <AccordionTrigger className="px-5 py-5 hover:no-underline sm:px-6 sm:py-6">
                <div className="flex items-center gap-2 text-left">
                  <Cake className="h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold leading-none tracking-tight text-foreground">
                      Aniversariantes de {nomeMesAtual}
                    </p>
                    <p className="mt-1.5 text-sm font-normal text-muted-foreground">
                      {aniversariantesDoMes.length === 0
                        ? 'Nenhum dizimista faz aniversário este mês.'
                        : `${aniversariantesDoMes.length} dizimista(s) fazem aniversário este mês.`}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                {aniversariantesDoMes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum aniversariante este mês.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {aniversariantesDoMes.map(({ dizimista: d, diaMes }) => (
                      <li key={d.numeroCarne} className="flex items-center gap-3 py-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                          {diaMes.slice(0, 2)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{d.nomeCompleto}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            Carnê nº {d.numeroCarne} · {d.telefone || '—'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      )}

      <FiltroBar busca={busca} onBuscaChange={setBusca} placeholder="Buscar por nome ou nº do carnê...">
        <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as StatusDizimista | 'todos')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </FiltroBar>

      {carregando ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : dizimistasFiltrados.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum dizimista encontrado" description="Ajuste a busca ou cadastre um novo dizimista." />
      ) : (
        <>
          <Card className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dizimista</TableHead>
                  <TableHead>Nº do carnê</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dizimistasFiltrados.map((d) => {
                  const status = statusPorCarne.get(d.numeroCarne)
                  return (
                    <TableRow
                      key={d.numeroCarne}
                      className="cursor-pointer"
                      onClick={() => navigate(ROUTES.pastoral.dizimistaDetalhe(d.numeroCarne))}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{getIniciais(d.nomeCompleto)}</AvatarFallback>
                          </Avatar>
                          <p className="truncate font-medium text-foreground">{d.nomeCompleto}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.numeroCarne}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.telefone}</TableCell>
                      <TableCell>
                        {status && <StatusBadge label={STATUS_CONFIG[status].label} variant={STATUS_CONFIG[status].variant} />}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDizimistaParaExcluir(d)
                          }}
                          aria-label={`Excluir ${d.nomeCompleto}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-3 lg:hidden">
            {dizimistasFiltrados.map((d) => {
              const status = statusPorCarne.get(d.numeroCarne)
              return (
                <Card
                  key={d.numeroCarne}
                  className="cursor-pointer"
                  onClick={() => navigate(ROUTES.pastoral.dizimistaDetalhe(d.numeroCarne))}
                >
                  <CardContent className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback>{getIniciais(d.nomeCompleto)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 truncate font-medium text-foreground">{d.nomeCompleto}</p>
                        {status && <StatusBadge label={STATUS_CONFIG[status].label} variant={STATUS_CONFIG[status].variant} />}
                      </div>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <IdCard className="h-3 w-3" />
                        Carnê nº {d.numeroCarne}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {d.telefone}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDizimistaParaExcluir(d)
                      }}
                      aria-label={`Excluir ${d.nomeCompleto}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar novo dizimista</DialogTitle>
          </DialogHeader>
          <RecadastramentoForm exibirCarne={false} onSalvar={handleCadastrar} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!dizimistaParaExcluir}
        onOpenChange={(open) => !open && setDizimistaParaExcluir(null)}
        title="Excluir dizimista"
        description={`Tem certeza que deseja excluir ${dizimistaParaExcluir?.nomeCompleto ?? ''}? O histórico de pagamentos e devoluções também será removido. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={handleExcluir}
      />
    </div>
  )
}
