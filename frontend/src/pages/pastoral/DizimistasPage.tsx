import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Cake, Download, IdCard, Pencil, Phone, Trash2, UserPlus, Users, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { FiltroBar } from '@/components/pastoral/FiltroBar'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatCard } from '@/components/dashboard/StatCard'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { GraficoEvolucaoMensal } from '@/components/dashboard/GraficoEvolucaoMensal'
import { RecadastramentoForm } from '@/components/forms/RecadastramentoForm'
import { DevolucaoForm } from '@/components/forms/DevolucaoForm'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

import {
  buscarDizimistaPorCarne,
  criarDizimistaAdmin,
  diaMesDoRegistro,
  excluirDizimista,
  listarDizimistas,
} from '@/services/dizimistaService'
import {
  competenciaDaDevolucao,
  lancarDevolucao,
  listarTodasDevolucoesPorCarne,
  type DadosDevolucao,
} from '@/services/devolucaoService'
import { obterMinimoMesesAtivos } from '@/services/configuracaoService'
import type { DadosCadastraisDizimista, Devolucao, Dizimista } from '@/types'
import { CARNE_AVULSO } from '@/constants/devolucao'
import { competenciaAtual, formatCurrency, getIniciais } from '@/utils/format'
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
  const [modalNovaDevolucao, setModalNovaDevolucao] = React.useState(false)
  const [carneNovaDevolucao, setCarneNovaDevolucao] = React.useState('')
  // Muda a cada lançamento com sucesso, forçando o DevolucaoForm a remontar com os campos em
  // branco — assim dá pra lançar várias devoluções seguidas sem fechar o diálogo.
  const [formularioNovaDevolucaoKey, setFormularioNovaDevolucaoKey] = React.useState(0)

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
  const totalGeral = React.useMemo(() => totalPorAno.reduce((soma, [, valor]) => soma + valor, 0), [totalPorAno])

  /** Total arrecadado em cada mês do ano atual, na ordem Jan..Dez — para o gráfico de evolução. */
  const evolucaoMensalAnoAtual = React.useMemo(() => {
    const porMes = Array(12).fill(0)
    for (const devolucoes of Object.values(devolucoesPorCarne)) {
      for (const d of devolucoes) {
        const competencia = competenciaDaDevolucao(d)
        if (!competencia.startsWith(anoAtual)) continue
        const indiceMes = Number(competencia.slice(5, 7)) - 1
        if (indiceMes >= 0 && indiceMes < 12) porMes[indiceMes] += d.valor
      }
    }
    return porMes
  }, [devolucoesPorCarne, anoAtual])

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

  async function handleLancarNovaDevolucao(dados: DadosDevolucao) {
    const numeroCarne = carneNovaDevolucao.trim()
    if (!numeroCarne) {
      throw new Error('Informe o número do carnê (ou -x- para avulsa).')
    }
    if (numeroCarne !== CARNE_AVULSO) {
      const dizimista = await buscarDizimistaPorCarne(numeroCarne)
      if (!dizimista) {
        throw new Error('Carnê não encontrado.')
      }
    }

    const nova = await lancarDevolucao(numeroCarne, dados)
    // Atualiza a lista local (status/totais recalculam sozinhos) em vez de buscar tudo nas
    // devoluções de novo — evita repetir a leitura mais cara do site a cada lançamento.
    setDevolucoesPorCarne((atual) => ({
      ...atual,
      [numeroCarne]: [...(atual[numeroCarne] ?? []), nova],
    }))
    toast.success('Devolução lançada com sucesso.')
    // Mantém o diálogo aberto pra lançar outra em seguida — limpa o carnê e reseta o formulário.
    setCarneNovaDevolucao('')
    setFormularioNovaDevolucaoKey((k) => k + 1)
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
            <Button
              variant="outline"
              onClick={() => {
                setCarneNovaDevolucao('')
                setModalNovaDevolucao(true)
              }}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Lançar devolução
            </Button>
            <Button onClick={() => setModalAberto(true)}>
              <UserPlus className="h-4 w-4" />
              Novo dizimista
            </Button>
          </>
        }
      />

      {/*
        No mobile as três contagens (ativos, inativos e total) dividem uma única linha em cards
        compactos, e o valor arrecadado — que é o texto mais longo — ocupa a linha inteira abaixo,
        para não quebrar. No desktop tudo volta para as quatro colunas de sempre.
      */}
      {carregando ? (
        <div className="mb-6 grid grid-cols-3 gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl lg:h-24" />
          ))}
          <Skeleton className="col-span-3 h-20 w-full rounded-xl lg:col-span-1 lg:h-24" />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-3 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard compact label="Ativos" value={String(totalAtivos)} icon={Users} />
          <StatCard compact label="Inativos" value={String(totalInativos)} icon={Users} />
          <StatCard compact label="Total" value={String(dizimistas.length)} icon={Users} />
          <div className="col-span-3 lg:col-span-1">
            <StatCard label={`Arrecadado em ${anoAtual}`} value={formatCurrency(totalAnoAtual)} icon={Wallet} tom="success" />
          </div>
        </div>
      )}

      {!carregando && totalPorAno.length > 0 && (
        <Card className="mb-6">
          <Accordion type="single" collapsible>
            <AccordionItem value="total-por-ano" className="border-b-0">
              <AccordionTrigger className="px-5 py-5 hover:no-underline sm:px-6 sm:py-6">
                <div className="flex items-center gap-2 text-left">
                  <Wallet className="h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold leading-none tracking-tight text-foreground">Total arrecadado por ano</p>
                    <p className="mt-1.5 text-sm font-normal text-muted-foreground">
                      Total geral: {formatCurrency(totalGeral)}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                <div className="mb-5">
                  <p className="mb-3 text-sm font-medium text-foreground">Evolução mensal em {anoAtual}</p>
                  <GraficoEvolucaoMensal valoresPorMes={evolucaoMensalAnoAtual} />
                </div>
                <ul className="divide-y divide-border">
                  {totalPorAno.map(([ano, total]) => (
                    <li key={ano} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="font-medium text-foreground">{ano}</span>
                      <span className="text-foreground">{formatCurrency(total)}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(ROUTES.pastoral.dizimistaDetalhe(d.numeroCarne))
                      }}
                      aria-label={`Editar ${d.nomeCompleto}`}
                    >
                      <Pencil className="h-4 w-4" />
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

      <Dialog open={modalNovaDevolucao} onOpenChange={setModalNovaDevolucao}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançar devolução</DialogTitle>
          </DialogHeader>
          {modalNovaDevolucao && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="numeroCarneNovaDevolucao">Nº do carnê</Label>
                <Input
                  id="numeroCarneNovaDevolucao"
                  inputMode="numeric"
                  placeholder="Número do carnê"
                  value={carneNovaDevolucao}
                  onChange={(e) => setCarneNovaDevolucao(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use <span className="font-mono font-medium text-foreground">{CARNE_AVULSO}</span> pra lançar uma
                  devolução avulsa (sem dizimista cadastrado).
                </p>
              </div>
              <DevolucaoForm
                key={formularioNovaDevolucaoKey}
                competenciaPadrao={competenciaAtual()}
                onSalvar={handleLancarNovaDevolucao}
                onCancelar={() => setModalNovaDevolucao(false)}
              />
            </div>
          )}
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
