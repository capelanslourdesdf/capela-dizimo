import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Cake, ChevronLeft, ChevronRight, Download, IdCard, Loader2, Pencil, Phone, Trash2, UserPlus, Users, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { FiltroBar } from '@/components/pastoral/FiltroBar'
import { CampoNumeroCarneDevolucao } from '@/components/pastoral/CampoNumeroCarneDevolucao'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

import {
  buscarDizimistaPorCarne,
  contarDizimistas,
  criarDizimistaAdmin,
  diaMesDoRegistro,
  excluirDizimista,
  listarAniversariantesDoMes,
  listarDizimistasPaginado,
  listarNumerosCarneAtivos,
  type CursorDizimistas,
} from '@/services/dizimistaService'
import { lancarDevolucao, obterTotaisDevolucaoPorAno, obterTotaisDevolucaoPorMes, type DadosDevolucao } from '@/services/devolucaoService'
import { obterContagemStatusAgregada, type ContagemStatus } from '@/services/statusAgregadoService'
import type { DadosCadastraisDizimista, Dizimista } from '@/types'
import { CARNE_AVULSO } from '@/constants/devolucao'
import { formatarNumeroCarne, formatCurrency, getIniciais } from '@/utils/format'
import { aguardarPeloMenos } from '@/utils/async'
import { baixarArquivoTexto } from '@/utils/download'
import type { StatusDizimista } from '@/utils/statusDizimista'
import { ROUTES } from '@/constants/routes'
import { useAdminSessao } from '@/hooks/useAdminSessao'
import { podeVerTotalArrecadado } from '@/constants/papeisAcesso'

const STATUS_CONFIG: Record<StatusDizimista, { label: string; variant: 'success' | 'muted' }> = {
  ativo: { label: 'Ativo', variant: 'success' },
  inativo: { label: 'Inativo', variant: 'muted' },
}

const ATRASO_DEBOUNCE_BUSCA_MS = 400
const DURACAO_MINIMA_LOADING_MS = 400

export function DizimistasPage() {
  const navigate = useNavigate()
  const { papel } = useAdminSessao()
  const podeVerTotal = podeVerTotalArrecadado(papel)

  // --- Tabela paginada (30 por página, busca e filtro de status resolvidos no Firestore) ---
  // Cada página buscada fica guardada aqui (por índice), então "página anterior" nunca refaz uma
  // leitura no Firestore — só reexibe o que já foi buscado nesta visita.
  const [paginasCache, setPaginasCache] = React.useState<Dizimista[][]>([])
  const [cursores, setCursores] = React.useState<(CursorDizimistas | null)[]>([null])
  const [indicePagina, setIndicePagina] = React.useState(0)
  const [temProximaPagina, setTemProximaPagina] = React.useState(false)
  const [carregandoTabela, setCarregandoTabela] = React.useState(true)
  const [erroIndice, setErroIndice] = React.useState<string | null>(null)

  const [busca, setBusca] = React.useState('')
  const [buscaAplicada, setBuscaAplicada] = React.useState('')
  const [filtroStatus, setFiltroStatus] = React.useState<StatusDizimista | 'todos'>('todos')

  // --- Resumo (cards, total por ano, aniversariantes) — vem de agregados, carregado 1x. ---
  const [carregandoResumo, setCarregandoResumo] = React.useState(true)
  const [contagemStatus, setContagemStatus] = React.useState<ContagemStatus>({ ativos: 0, inativos: 0 })
  const [totalDizimistas, setTotalDizimistas] = React.useState(0)
  const [totaisPorAnoAgregado, setTotaisPorAnoAgregado] = React.useState<Record<string, number>>({})
  const [totaisPorMesAgregado, setTotaisPorMesAgregado] = React.useState<Record<string, number>>({})
  const [aniversariantesDoMes, setAniversariantesDoMes] = React.useState<Dizimista[]>([])

  const [modalAberto, setModalAberto] = React.useState(false)
  const [dizimistaParaExcluir, setDizimistaParaExcluir] = React.useState<Dizimista | null>(null)
  const [modalNovaDevolucao, setModalNovaDevolucao] = React.useState(false)
  const [carneNovaDevolucao, setCarneNovaDevolucao] = React.useState('')
  const [devolucaoAvulsa, setDevolucaoAvulsa] = React.useState(false)
  const [formularioNovaDevolucaoKey, setFormularioNovaDevolucaoKey] = React.useState(0)
  const [exportandoAtivos, setExportandoAtivos] = React.useState(false)

  const buscarPagina = React.useCallback(
    async (indice: number, cursor: CursorDizimistas | null) => {
      const inicio = Date.now()
      setCarregandoTabela(true)
      setErroIndice(null)
      try {
        const { itens, proximoCursor } = await listarDizimistasPaginado({
          cursor,
          busca: buscaAplicada,
          status: filtroStatus,
        })
        await aguardarPeloMenos(inicio, DURACAO_MINIMA_LOADING_MS)
        setPaginasCache((atual) => {
          const copia = [...atual]
          copia[indice] = itens
          return copia
        })
        setCursores((atual) => {
          const copia = [...atual]
          copia[indice + 1] = proximoCursor
          return copia
        })
        setTemProximaPagina(!!proximoCursor)
        setIndicePagina(indice)
      } catch {
        // Erro mais comum aqui é índice composto do Firestore ainda não criado (ex.: buscar por
        // nome com o filtro de status ativo) — a mensagem do próprio erro traz o link para criá-lo.
        setErroIndice('Não foi possível carregar esta busca agora. Tente novamente em instantes.')
      } finally {
        setCarregandoTabela(false)
      }
    },
    [buscaAplicada, filtroStatus],
  )

  // Busca/filtro mudou: zera a paginação e busca a página 1 de novo.
  React.useEffect(() => {
    setPaginasCache([])
    setCursores([null])
    buscarPagina(0, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaAplicada, filtroStatus])

  // Debounce: só dispara a busca no Firestore quando a pessoa para de digitar.
  React.useEffect(() => {
    const termo = busca.trim()
    if (termo === buscaAplicada) return
    const timer = setTimeout(() => setBuscaAplicada(termo), ATRASO_DEBOUNCE_BUSCA_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca])

  const carregarResumo = React.useCallback(async () => {
    setCarregandoResumo(true)
    const mesAtual = new Date().getMonth() + 1
    const [total, status, porAno, porMes, aniversariantes] = await Promise.all([
      contarDizimistas(),
      obterContagemStatusAgregada(),
      obterTotaisDevolucaoPorAno(),
      obterTotaisDevolucaoPorMes(),
      listarAniversariantesDoMes(mesAtual),
    ])
    setTotalDizimistas(total)
    setContagemStatus(status)
    setTotaisPorAnoAgregado(porAno)
    setTotaisPorMesAgregado(porMes)
    setAniversariantesDoMes(aniversariantes)
    setCarregandoResumo(false)
  }, [])

  React.useEffect(() => {
    carregarResumo()
  }, [carregarResumo])

  const irParaPagina = React.useCallback(
    (indice: number) => {
      if (paginasCache[indice]) {
        setIndicePagina(indice)
        setTemProximaPagina(!!cursores[indice + 1])
        return
      }
      const cursor = cursores[indice]
      if (cursor === undefined) return
      buscarPagina(indice, cursor)
    },
    [paginasCache, cursores, buscarPagina],
  )

  /** Reler a página atual do Firestore (ignorando o cache) — usado depois de lançar uma devolução, já que ela pode ter mudado o status do dizimista exibido na tabela. */
  const recarregarPaginaAtual = React.useCallback(() => {
    buscarPagina(indicePagina, cursores[indicePagina] ?? null)
  }, [buscarPagina, indicePagina, cursores])

  const dizimistasDaPagina = paginasCache[indicePagina] ?? []

  const totalPorAno = React.useMemo(
    () => Object.entries(totaisPorAnoAgregado).sort((a, b) => (a[0] < b[0] ? 1 : -1)),
    [totaisPorAnoAgregado],
  )
  const anoAtual = String(new Date().getFullYear())
  const totalAnoAtual = totalPorAno.find(([ano]) => ano === anoAtual)?.[1] ?? 0
  const totalGeral = React.useMemo(() => totalPorAno.reduce((soma, [, valor]) => soma + valor, 0), [totalPorAno])

  const evolucaoMensalAnoAtual = React.useMemo(() => {
    const porMes = Array(12).fill(0)
    for (let mes = 1; mes <= 12; mes++) {
      const competencia = `${anoAtual}-${String(mes).padStart(2, '0')}`
      porMes[mes - 1] = totaisPorMesAgregado[competencia] ?? 0
    }
    return porMes
  }, [totaisPorMesAgregado, anoAtual])

  const aniversariantesOrdenados = React.useMemo(
    () =>
      aniversariantesDoMes
        .map((d) => ({ dizimista: d, diaMes: diaMesDoRegistro(d) }))
        .filter(({ diaMes }) => /^\d{2}\/\d{2}$/.test(diaMes))
        .sort((a, b) => Number(a.diaMes.slice(0, 2)) - Number(b.diaMes.slice(0, 2))),
    [aniversariantesDoMes],
  )

  const nomeMesAtual = React.useMemo(() => {
    const nome = new Date().toLocaleDateString('pt-BR', { month: 'long' })
    return nome.charAt(0).toUpperCase() + nome.slice(1)
  }, [])

  async function handleCadastrar(dados: DadosCadastraisDizimista) {
    const numeroCarne = await criarDizimistaAdmin(dados)
    setModalAberto(false)
    toast.success(`Dizimista cadastrado(a) com o carnê nº ${formatarNumeroCarne(numeroCarne)}.`)
    navigate(ROUTES.pastoral.dizimistaDetalhe(numeroCarne))
  }

  async function handleExcluir() {
    if (!dizimistaParaExcluir) return
    try {
      await excluirDizimista(dizimistaParaExcluir.numeroCarne)
      setPaginasCache((atual) => {
        const copia = [...atual]
        copia[indicePagina] = (copia[indicePagina] ?? []).filter((d) => d.numeroCarne !== dizimistaParaExcluir.numeroCarne)
        return copia
      })
      setTotalDizimistas((atual) => Math.max(0, atual - 1))
      toast.success(`${dizimistaParaExcluir.nomeCompleto} foi excluído(a).`)
      setDizimistaParaExcluir(null)
    } catch {
      toast.error('Não foi possível excluir o dizimista. Tente novamente.')
    }
  }

  async function handleLancarNovaDevolucao(dados: DadosDevolucao) {
    const digitado = devolucaoAvulsa ? CARNE_AVULSO : carneNovaDevolucao.trim()
    if (!digitado) {
      throw new Error('Informe o número do carnê (ou marque "Devolução avulsa").')
    }

    let numeroCarne = digitado
    if (digitado !== CARNE_AVULSO) {
      const dizimista = await buscarDizimistaPorCarne(digitado)
      if (!dizimista) {
        throw new Error('Carnê não encontrado.')
      }
      numeroCarne = dizimista.numeroCarne
    }

    await lancarDevolucao(numeroCarne, dados)
    toast.success('Devolução lançada com sucesso.')
    // O lançamento pode ter mudado o status do dizimista (virou Ativo) e os totais agregados —
    // recarrega o resumo e a página atual da tabela para refletir isso, em vez de reler tudo.
    carregarResumo()
    recarregarPaginaAtual()
    setCarneNovaDevolucao('')
    setDevolucaoAvulsa(false)
    setFormularioNovaDevolucaoKey((k) => k + 1)
  }

  async function handleExportarAtivos() {
    setExportandoAtivos(true)
    try {
      const carnes = await listarNumerosCarneAtivos()
      if (carnes.length === 0) {
        toast.info('Nenhum dizimista ativo para exportar.')
        return
      }
      const conteudo = carnes.map(formatarNumeroCarne).join('\n')
      const hoje = new Date().toISOString().slice(0, 10)
      baixarArquivoTexto(`carnes-ativos-${hoje}.txt`, conteudo)
      toast.success(`${carnes.length} carnê(s) exportado(s).`)
    } finally {
      setExportandoAtivos(false)
    }
  }

  const paginaVazia = !carregandoTabela && dizimistasDaPagina.length === 0
  const semResultadoNenhum = paginaVazia && indicePagina === 0

  return (
    <div>
      <PageHeader
        title="Dizimistas"
        description={`${totalDizimistas} dizimista(s) cadastrado(s)`}
        actions={
          <>
            <Button variant="outline" onClick={handleExportarAtivos} disabled={exportandoAtivos}>
              {exportandoAtivos ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar ativos
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCarneNovaDevolucao('')
                setDevolucaoAvulsa(false)
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

      {carregandoResumo ? (
        <div className={podeVerTotal ? 'mb-6 grid grid-cols-3 gap-3 lg:grid-cols-4 lg:gap-4' : 'mb-6 grid grid-cols-3 gap-3 lg:gap-4'}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl lg:h-24" />
          ))}
          {podeVerTotal && <Skeleton className="col-span-3 h-20 w-full rounded-xl lg:col-span-1 lg:h-24" />}
        </div>
      ) : (
        <div className={podeVerTotal ? 'mb-6 grid grid-cols-3 gap-3 lg:grid-cols-4 lg:gap-4' : 'mb-6 grid grid-cols-3 gap-3 lg:gap-4'}>
          <StatCard compact label="Ativos" value={String(contagemStatus.ativos)} icon={Users} />
          <StatCard compact label="Inativos" value={String(contagemStatus.inativos)} icon={Users} />
          <StatCard compact label="Total" value={String(totalDizimistas)} icon={Users} />
          {podeVerTotal && (
            <div className="col-span-3 lg:col-span-1">
              <StatCard label={`Arrecadado em ${anoAtual}`} value={formatCurrency(totalAnoAtual)} icon={Wallet} tom="success" />
            </div>
          )}
        </div>
      )}

      {!carregandoResumo && podeVerTotal && totalPorAno.length > 0 && (
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

      {!carregandoResumo && (
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
                      {aniversariantesOrdenados.length === 0
                        ? 'Nenhum dizimista faz aniversário este mês.'
                        : `${aniversariantesOrdenados.length} dizimista(s) fazem aniversário este mês.`}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                {aniversariantesOrdenados.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum aniversariante este mês.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {aniversariantesOrdenados.map(({ dizimista: d, diaMes }) => (
                      <li key={d.numeroCarne} className="flex items-center gap-3 py-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                          {diaMes.slice(0, 2)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{d.nomeCompleto}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            Carnê nº {formatarNumeroCarne(d.numeroCarne)} · {d.telefone || '—'}
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

      {carregandoTabela ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : erroIndice ? (
        <EmptyState icon={Users} title="Não foi possível carregar" description={erroIndice} />
      ) : semResultadoNenhum ? (
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
                {dizimistasDaPagina.map((d) => {
                  const status = d.status
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
                      <TableCell className="text-sm text-muted-foreground">{formatarNumeroCarne(d.numeroCarne)}</TableCell>
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
            {dizimistasDaPagina.map((d) => {
              const status = d.status
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
                        Carnê nº {formatarNumeroCarne(d.numeroCarne)}
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

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => irParaPagina(indicePagina - 1)}
              disabled={indicePagina === 0 || carregandoTabela}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <p className="text-sm text-muted-foreground">Página {indicePagina + 1}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => irParaPagina(indicePagina + 1)}
              disabled={!temProximaPagina || carregandoTabela}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
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
              <CampoNumeroCarneDevolucao
                numeroCarne={carneNovaDevolucao}
                onNumeroCarneChange={setCarneNovaDevolucao}
                avulsa={devolucaoAvulsa}
                onAvulsaChange={setDevolucaoAvulsa}
              />
              <DevolucaoForm
                key={formularioNovaDevolucaoKey}
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
