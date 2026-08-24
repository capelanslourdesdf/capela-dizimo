import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Eye,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  Lock,
  Pencil,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
  Unlock,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatCard } from '@/components/dashboard/StatCard'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { FiltroBar } from '@/components/pastoral/FiltroBar'
import { ReceitaTesourariaForm, type DadosReceitaTesouraria } from '@/components/forms/ReceitaTesourariaForm'
import { DespesaTesourariaForm, type DadosDespesaTesouraria } from '@/components/forms/DespesaTesourariaForm'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

import {
  ehReceitaCalculada,
  obterOuCriarControleTesouraria,
  receitasDizimoDaCompetencia,
  salvarControleTesouraria,
} from '@/services/tesourariaService'
import { listarTodasDevolucoesPorCarne } from '@/services/devolucaoService'
import type { ControleTesouraria, Devolucao, EntradaTesouraria, SaidaTesouraria, StatusControleTesouraria } from '@/types'
import {
  CATEGORIAS_ENTRADA_TESOURARIA,
  STATUS_CONTROLE_TESOURARIA,
  URL_CONSULTA_NFE,
  categoriaEntradaLabel,
} from '@/constants/tesouraria'
import { formaPagamentoLabel } from '@/constants/devolucao'
import { gerarPdfControleTesouraria } from '@/utils/pdfTesouraria'
import { gerarExcelControleTesouraria } from '@/utils/excelTesouraria'
import { formatCompetencia, formatCurrency, formatDate, maskChaveNfe } from '@/utils/format'
import { ROUTES } from '@/constants/routes'
import { useTesourariaSessao } from '@/hooks/useTesourariaSessao'
import { useDefinirPageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/lib/utils'

interface CampoDetalheProps {
  label: string
  valor: React.ReactNode
  className?: string
  /** Preserva quebras de linha digitadas — usado em campos de texto livre (ex.: Observação). */
  preWrap?: boolean
}

/** Par rótulo/valor usado nos diálogos de "ver detalhes" (visualização, sem edição). */
function CampoDetalhe({ label, valor, className, preWrap }: CampoDetalheProps) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('mt-0.5 break-words text-sm font-medium text-foreground', preWrap && 'whitespace-pre-wrap')}>
        {valor}
      </dd>
    </div>
  )
}

function montarReceita(id: string, dados: DadosReceitaTesouraria): EntradaTesouraria {
  const observacao = dados.observacao?.trim()
  return {
    id,
    data: dados.data,
    categoria: dados.categoria,
    valor: dados.valor,
    formaPagamento: dados.formaPagamento,
    ...(observacao ? { observacao } : {}),
  }
}

/** Compara o termo de busca com todos os campos da despesa (inclusive os exibidos como texto/rótulo). */
function despesaCombinaBusca(s: SaidaTesouraria, termo: string): boolean {
  const partes = [
    s.prestador,
    s.solicitante,
    s.observacao ?? '',
    s.dia ? formatDate(s.dia) : '',
    formatCurrency(s.valor),
    s.quitado ? 'quitada' : 'pendente',
    s.possuiNfe ? 'possui nf-e nota fiscal' : '',
    s.chaveNfe ?? '',
  ]
  return partes.join(' ').toLowerCase().includes(termo)
}

function montarDespesa(id: string, dados: DadosDespesaTesouraria): SaidaTesouraria {
  const observacao = dados.observacao?.trim()
  const chaveNfe = dados.possuiNfe ? dados.chaveNfe?.trim() : undefined
  return {
    id,
    dia: dados.dia,
    solicitante: dados.solicitante,
    prestador: dados.prestador,
    valor: dados.valor,
    quitado: dados.quitado,
    possuiNfe: dados.possuiNfe,
    ...(chaveNfe ? { chaveNfe } : {}),
    ...(observacao ? { observacao } : {}),
  }
}

export function ControleMensalPage() {
  const { competencia } = useParams<{ competencia: string }>()
  const navigate = useNavigate()
  const { podeEditar } = useTesourariaSessao()
  useDefinirPageTitle(competencia ? formatCompetencia(competencia) : 'Tesouraria')

  const [controle, setControle] = React.useState<ControleTesouraria | null>(null)
  const [todasDevolucoes, setTodasDevolucoes] = React.useState<Devolucao[]>([])
  const [carregando, setCarregando] = React.useState(true)

  const [modalReceita, setModalReceita] = React.useState(false)
  const [receitaEmEdicao, setReceitaEmEdicao] = React.useState<EntradaTesouraria | null>(null)
  const [receitaParaRemover, setReceitaParaRemover] = React.useState<EntradaTesouraria | null>(null)
  const [receitaEmVisualizacao, setReceitaEmVisualizacao] = React.useState<EntradaTesouraria | null>(null)

  const [modalDespesa, setModalDespesa] = React.useState(false)
  const [despesaEmEdicao, setDespesaEmEdicao] = React.useState<SaidaTesouraria | null>(null)
  const [despesaParaRemover, setDespesaParaRemover] = React.useState<SaidaTesouraria | null>(null)
  const [despesaEmVisualizacao, setDespesaEmVisualizacao] = React.useState<SaidaTesouraria | null>(null)

  const [modalStatus, setModalStatus] = React.useState(false)
  const [buscaDespesa, setBuscaDespesa] = React.useState('')

  const carregar = React.useCallback(async () => {
    if (!competencia) return
    setCarregando(true)
    // Só precisa do mês atual — não do histórico inteiro.
    const [atual, porCarne] = await Promise.all([
      obterOuCriarControleTesouraria(competencia),
      listarTodasDevolucoesPorCarne(competencia, competencia),
    ])
    setControle(atual)
    setTodasDevolucoes(Object.values(porCarne).flat())
    setCarregando(false)
  }, [competencia])

  React.useEffect(() => {
    carregar()
  }, [carregar])

  function handleNovaReceita() {
    setReceitaEmEdicao(null)
    setModalReceita(true)
  }

  function handleEditarReceita(receita: EntradaTesouraria) {
    setReceitaEmEdicao(receita)
    setModalReceita(true)
  }

  async function handleSalvarReceita(dados: DadosReceitaTesouraria) {
    if (!competencia || !controle) return
    const novasEntradas = receitaEmEdicao
      ? controle.entradas.map((e) => (e.id === receitaEmEdicao.id ? montarReceita(e.id, dados) : e))
      : [...controle.entradas, montarReceita(crypto.randomUUID(), dados)]

    await salvarControleTesouraria(competencia, { status: controle.status, entradas: novasEntradas, saidas: controle.saidas })
    setControle({ ...controle, entradas: novasEntradas, atualizadoEm: new Date().toISOString() })
    setModalReceita(false)
    setReceitaEmEdicao(null)
    toast.success(receitaEmEdicao ? 'Receita atualizada com sucesso.' : 'Receita lançada com sucesso.')
  }

  async function handleRemoverReceita() {
    if (!competencia || !controle || !receitaParaRemover) return
    const novasEntradas = controle.entradas.filter((e) => e.id !== receitaParaRemover.id)
    await salvarControleTesouraria(competencia, { status: controle.status, entradas: novasEntradas, saidas: controle.saidas })
    setControle({ ...controle, entradas: novasEntradas, atualizadoEm: new Date().toISOString() })
    setReceitaParaRemover(null)
    toast.success('Receita removida.')
  }

  function handleNovaDespesa() {
    setDespesaEmEdicao(null)
    setModalDespesa(true)
  }

  function handleEditarDespesa(despesa: SaidaTesouraria) {
    setDespesaEmEdicao(despesa)
    setModalDespesa(true)
  }

  async function handleSalvarDespesa(dados: DadosDespesaTesouraria) {
    if (!competencia || !controle) return
    const novasSaidas = despesaEmEdicao
      ? controle.saidas.map((s) => (s.id === despesaEmEdicao.id ? montarDespesa(s.id, dados) : s))
      : [...controle.saidas, montarDespesa(crypto.randomUUID(), dados)]

    await salvarControleTesouraria(competencia, { status: controle.status, entradas: controle.entradas, saidas: novasSaidas })
    setControle({ ...controle, saidas: novasSaidas, atualizadoEm: new Date().toISOString() })
    setModalDespesa(false)
    setDespesaEmEdicao(null)
    toast.success(despesaEmEdicao ? 'Despesa atualizada com sucesso.' : 'Despesa lançada com sucesso.')
  }

  async function handleRemoverDespesa() {
    if (!competencia || !controle || !despesaParaRemover) return
    const novasSaidas = controle.saidas.filter((s) => s.id !== despesaParaRemover.id)
    await salvarControleTesouraria(competencia, { status: controle.status, entradas: controle.entradas, saidas: novasSaidas })
    setControle({ ...controle, saidas: novasSaidas, atualizadoEm: new Date().toISOString() })
    setDespesaParaRemover(null)
    toast.success('Despesa removida.')
  }

  async function handleConfirmarStatus() {
    if (!competencia || !controle) return
    const novoStatus: StatusControleTesouraria = controle.status === 'em_andamento' ? 'fechado' : 'em_andamento'
    await salvarControleTesouraria(competencia, { status: novoStatus, entradas: controle.entradas, saidas: controle.saidas })
    setControle({ ...controle, status: novoStatus, atualizadoEm: new Date().toISOString() })
    setModalStatus(false)
    toast.success(novoStatus === 'fechado' ? 'Mês marcado como fechado.' : 'Mês reaberto para edição.')
  }

  /**
   * O Portal Nacional da NF-e não tem um jeito confiável de pré-preencher a chave via link (exige
   * digitar manualmente após um captcha), então copiamos a chave pra área de transferência ao
   * abrir a página — cola rápido assim que o site carregar.
   */
  function handleConsultarNota(chaveNfe: string) {
    navigator.clipboard.writeText(chaveNfe.replace(/\D/g, '')).then(
      () => toast.success('Chave de acesso copiada — cole no site da Receita.'),
      () => {},
    )
  }

  if (carregando || !controle) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Dízimo lançado nas devoluções da Pastoral pra esse mês — nunca é salvo no documento da
  // Tesouraria, é recalculado toda vez a partir da fonte real (as devoluções).
  const receitasDizimo = receitasDizimoDaCompetencia(controle.competencia, todasDevolucoes)
  const todasReceitas = [...controle.entradas, ...receitasDizimo]

  const totalReceitas = todasReceitas.reduce((s, e) => s + e.valor, 0)
  const totalDespesas = controle.saidas.reduce((s, sa) => s + sa.valor, 0)
  const saldo = totalReceitas - totalDespesas

  const totaisPorCategoria = CATEGORIAS_ENTRADA_TESOURARIA.map((cat) => ({
    label: cat.label,
    total: todasReceitas.filter((e) => e.categoria === cat.value).reduce((s, e) => s + e.valor, 0),
  })).filter((c) => c.total > 0)

  // Mais recente primeiro, como no resto do histórico financeiro do app.
  const receitasOrdenadas = [...todasReceitas].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
  const despesasOrdenadas = [...controle.saidas].sort((a, b) => (a.dia < b.dia ? 1 : a.dia > b.dia ? -1 : 0))
  const termoBuscaDespesa = buscaDespesa.trim().toLowerCase()
  const despesasFiltradas = termoBuscaDespesa
    ? despesasOrdenadas.filter((s) => despesaCombinaBusca(s, termoBuscaDespesa))
    : despesasOrdenadas
  const totalDespesasFiltradas = despesasFiltradas.reduce((s, sa) => s + sa.valor, 0)

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate(ROUTES.pastoral.tesouraria.root)}>
        <ArrowLeft className="h-4 w-4" />
        Voltar ao painel
      </Button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {/* No celular o topo fixo já mostra o mês (ver AppTopbar) — não repete aqui. */}
            <h1 className="hidden text-xl font-semibold tracking-tight text-foreground lg:block lg:text-2xl">
              {formatCompetencia(controle.competencia)}
            </h1>
            <StatusBadge label={STATUS_CONTROLE_TESOURARIA[controle.status]} variant={controle.status === 'fechado' ? 'muted' : 'success'} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Controle financeiro mensal da Tesouraria.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => gerarPdfControleTesouraria({ ...controle, entradas: todasReceitas })}>
            <FileDown className="h-4 w-4" />
            Gerar PDF
          </Button>
          <Button onClick={() => gerarExcelControleTesouraria({ ...controle, entradas: todasReceitas })}>
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
          {podeEditar && (
            <Button onClick={() => setModalStatus(true)}>
              {controle.status === 'em_andamento' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {controle.status === 'em_andamento' ? 'Fechar mês' : 'Reabrir mês'}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        <StatCard compact tom="success" label="Total de receita" value={formatCurrency(totalReceitas)} icon={TrendingUp} />
        <StatCard compact tom="destructive" label="Total de despesas" value={formatCurrency(totalDespesas)} icon={TrendingDown} />
        <StatCard compact tom={saldo >= 0 ? 'success' : 'destructive'} label="Saldo total" value={formatCurrency(saldo)} icon={Wallet} />
      </div>

      {totaisPorCategoria.length > 0 && (
        <Card className="mb-6">
          <Accordion type="single" collapsible>
            <AccordionItem value="categoria" className="border-b-0">
              <AccordionTrigger className="rounded-t-xl px-5 py-5 transition-colors hover:bg-muted/60 hover:no-underline active:bg-muted/60 sm:px-6 sm:py-6">
                <div className="flex items-center gap-2 text-left">
                  <Wallet className="h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold leading-none tracking-tight text-foreground">Receitas por categoria</p>
                    <p className="mt-1.5 text-sm font-normal text-muted-foreground">
                      {totaisPorCategoria.length} categoria(s) com lançamento
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                <ul className="divide-y divide-border">
                  {totaisPorCategoria.map((c) => (
                    <li key={c.label} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="font-medium text-foreground">{c.label}</span>
                      <span className="text-foreground">{formatCurrency(c.total)}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      )}

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Receitas</h2>
          {podeEditar && (
            <Button variant="success" size="sm" onClick={handleNovaReceita}>
              <Plus className="h-3.5 w-3.5" />
              Lançar receita
            </Button>
          )}
        </div>
        <Card>
          <Accordion type="single" collapsible>
            <AccordionItem value="receitas" className="border-b-0">
              <AccordionTrigger className="rounded-t-xl px-5 py-5 transition-colors hover:bg-muted/60 hover:no-underline active:bg-muted/60 sm:px-6 sm:py-6">
                <div className="flex items-center gap-2 text-left">
                  <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold leading-none tracking-tight text-foreground">Lista de receitas do mês</p>
                    <p className="mt-1.5 text-sm font-normal text-muted-foreground">
                      {receitasOrdenadas.length === 0
                        ? 'Nenhuma receita lançada'
                        : `${receitasOrdenadas.length} receita(s) · ${formatCurrency(totalReceitas)}`}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2.5 px-5 pb-5 sm:px-6 sm:pb-6">
                {receitasOrdenadas.length === 0 ? (
                  <EmptyState icon={TrendingUp} title="Nenhuma receita lançada neste mês" />
                ) : (
                  receitasOrdenadas.map((e) => {
                    const calculada = ehReceitaCalculada(e.id)
                    return (
                      <div
                        key={e.id}
                        className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-medium text-foreground">{categoriaEntradaLabel(e.categoria)}</p>
                            {calculada && <StatusBadge label="Calculado" variant="outline" />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {e.data ? formatDate(e.data) : '—'} · {formaPagamentoLabel(e.formaPagamento)}
                          </p>
                          {e.observacao && (
                            <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{e.observacao}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 sm:justify-end">
                          <p className="font-medium text-success">{formatCurrency(e.valor)}</p>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setReceitaEmVisualizacao(e)}
                              aria-label="Ver detalhes da receita"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {podeEditar && !calculada && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditarReceita(e)}
                                  aria-label="Editar receita"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => setReceitaParaRemover(e)}
                                  aria-label="Remover receita"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Despesas</h2>
          {podeEditar && (
            <Button variant="destructive" size="sm" onClick={handleNovaDespesa}>
              <Plus className="h-3.5 w-3.5" />
              Lançar despesa
            </Button>
          )}
        </div>
        <Card>
          <Accordion type="single" collapsible>
            <AccordionItem value="despesas" className="border-b-0">
              <AccordionTrigger className="rounded-t-xl px-5 py-5 transition-colors hover:bg-muted/60 hover:no-underline active:bg-muted/60 sm:px-6 sm:py-6">
                <div className="flex items-center gap-2 text-left">
                  <TrendingDown className="h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold leading-none tracking-tight text-foreground">Lista de despesas do mês</p>
                    <p className="mt-1.5 text-sm font-normal text-muted-foreground">
                      {despesasOrdenadas.length === 0
                        ? 'Nenhuma despesa lançada'
                        : `${despesasOrdenadas.length} despesa(s) · ${formatCurrency(totalDespesas)}`}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2.5 px-5 pb-5 sm:px-6 sm:pb-6">
                {despesasOrdenadas.length > 0 && (
                  <FiltroBar
                    busca={buscaDespesa}
                    onBuscaChange={setBuscaDespesa}
                    placeholder="Buscar por quem fez, prestador, valor, observação..."
                  />
                )}
                {termoBuscaDespesa && (
                  <p className="-mt-1.5 text-sm text-muted-foreground">
                    {despesasFiltradas.length} despesa(s) encontrada(s) · Total {formatCurrency(totalDespesasFiltradas)}
                  </p>
                )}
                {despesasOrdenadas.length === 0 ? (
                  <EmptyState icon={TrendingDown} title="Nenhuma despesa lançada neste mês" />
                ) : despesasFiltradas.length === 0 ? (
                  <EmptyState icon={TrendingDown} title="Nenhuma despesa encontrada para essa busca" />
                ) : (
                  despesasFiltradas.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{s.prestador}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.dia ? formatDate(s.dia) : '—'} · Solicitado por {s.solicitante}
                        </p>
                        {s.observacao && (
                          <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{s.observacao}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge label={s.quitado ? 'Quitada' : 'Pendente'} variant={s.quitado ? 'success' : 'warning'} />
                          {s.possuiNfe && <StatusBadge label="Possui NF-e" variant="outline" />}
                          <p className="font-medium text-destructive">{formatCurrency(s.valor)}</p>
                        </div>
                        <div className="flex items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDespesaEmVisualizacao(s)}
                            aria-label="Ver detalhes da despesa"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {podeEditar && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditarDespesa(s)}
                                aria-label="Editar despesa"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDespesaParaRemover(s)}
                                aria-label="Remover despesa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>

      <Dialog open={modalReceita} onOpenChange={setModalReceita}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{receitaEmEdicao ? 'Editar receita' : 'Lançar receita'}</DialogTitle>
          </DialogHeader>
          <ReceitaTesourariaForm
            key={receitaEmEdicao?.id ?? 'nova'}
            receita={receitaEmEdicao ?? undefined}
            onSalvar={handleSalvarReceita}
            onCancelar={() => setModalReceita(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modalDespesa} onOpenChange={setModalDespesa}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{despesaEmEdicao ? 'Editar despesa' : 'Lançar despesa'}</DialogTitle>
          </DialogHeader>
          <DespesaTesourariaForm
            key={despesaEmEdicao?.id ?? 'nova'}
            despesa={despesaEmEdicao ?? undefined}
            onSalvar={handleSalvarDespesa}
            onCancelar={() => setModalDespesa(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!receitaEmVisualizacao} onOpenChange={(open) => !open && setReceitaEmVisualizacao(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da receita</DialogTitle>
          </DialogHeader>
          {receitaEmVisualizacao && (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampoDetalhe label="Categoria" valor={categoriaEntradaLabel(receitaEmVisualizacao.categoria)} />
              <CampoDetalhe
                label="Data"
                valor={receitaEmVisualizacao.data ? formatDate(receitaEmVisualizacao.data) : '—'}
              />
              <CampoDetalhe label="Valor" valor={formatCurrency(receitaEmVisualizacao.valor)} />
              <CampoDetalhe label="Forma de pagamento" valor={formaPagamentoLabel(receitaEmVisualizacao.formaPagamento)} />
              <CampoDetalhe
                className="sm:col-span-2"
                label="Observação"
                valor={receitaEmVisualizacao.observacao || '—'}
                preWrap
              />
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!despesaEmVisualizacao} onOpenChange={(open) => !open && setDespesaEmVisualizacao(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da despesa</DialogTitle>
          </DialogHeader>
          {despesaEmVisualizacao && (
            <div className="space-y-5">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CampoDetalhe label="Empresa/Prestador" valor={despesaEmVisualizacao.prestador} />
                <CampoDetalhe label="Quem solicitou" valor={despesaEmVisualizacao.solicitante} />
                <CampoDetalhe label="Data" valor={despesaEmVisualizacao.dia ? formatDate(despesaEmVisualizacao.dia) : '—'} />
                <CampoDetalhe label="Valor" valor={formatCurrency(despesaEmVisualizacao.valor)} />
                <CampoDetalhe label="Quitada" valor={despesaEmVisualizacao.quitado ? 'Sim' : 'Não'} />
                <CampoDetalhe label="Possui NF-e" valor={despesaEmVisualizacao.possuiNfe ? 'Sim' : 'Não'} />
                {despesaEmVisualizacao.possuiNfe && despesaEmVisualizacao.chaveNfe && (
                  <CampoDetalhe
                    className="sm:col-span-2"
                    label="Chave de acesso"
                    valor={maskChaveNfe(despesaEmVisualizacao.chaveNfe)}
                  />
                )}
                <CampoDetalhe
                  className="sm:col-span-2"
                  label="Observação"
                  valor={despesaEmVisualizacao.observacao || '—'}
                  preWrap
                />
              </dl>

              {despesaEmVisualizacao.possuiNfe && despesaEmVisualizacao.chaveNfe && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                  onClick={() => handleConsultarNota(despesaEmVisualizacao.chaveNfe ?? '')}
                >
                  <a href={URL_CONSULTA_NFE} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Consultar nota fiscal
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!receitaParaRemover}
        onOpenChange={(open) => !open && setReceitaParaRemover(null)}
        title="Remover receita"
        description="Tem certeza que deseja remover esta receita? Essa ação não pode ser desfeita."
        confirmLabel="Remover"
        destructive
        onConfirm={handleRemoverReceita}
      />

      <ConfirmDialog
        open={!!despesaParaRemover}
        onOpenChange={(open) => !open && setDespesaParaRemover(null)}
        title="Remover despesa"
        description="Tem certeza que deseja remover esta despesa? Essa ação não pode ser desfeita."
        confirmLabel="Remover"
        destructive
        onConfirm={handleRemoverDespesa}
      />

      <ConfirmDialog
        open={modalStatus}
        onOpenChange={setModalStatus}
        title={controle.status === 'em_andamento' ? 'Fechar mês' : 'Reabrir mês'}
        description={
          controle.status === 'em_andamento'
            ? `Marcar ${formatCompetencia(controle.competencia)} como fechado?`
            : `Reabrir ${formatCompetencia(controle.competencia)} para edição?`
        }
        confirmLabel={controle.status === 'em_andamento' ? 'Fechar mês' : 'Reabrir mês'}
        onConfirm={handleConfirmarStatus}
      />
    </div>
  )
}
