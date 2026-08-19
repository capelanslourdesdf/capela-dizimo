import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileDown, Pencil, Plus, TrendingDown, TrendingUp, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatCard } from '@/components/dashboard/StatCard'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

import { obterOuCriarControleTesouraria, salvarControleTesouraria } from '@/services/tesourariaService'
import type { CategoriaEntradaTesouraria, ControleTesouraria, EntradaTesouraria, SaidaTesouraria, StatusControleTesouraria } from '@/types'
import { CATEGORIAS_ENTRADA_TESOURARIA, STATUS_CONTROLE_TESOURARIA, categoriaEntradaLabel } from '@/constants/tesouraria'
import { gerarPdfControleTesouraria } from '@/utils/pdfTesouraria'
import {
  dataBrEhValida,
  dataBrParaIso,
  dataIsoParaBr,
  finalizarMoeda,
  formatCompetencia,
  formatCurrency,
  maskDataBr,
  maskMoeda,
  moedaParaNumero,
  numeroParaMoeda,
} from '@/utils/format'
import { ROUTES } from '@/constants/routes'

interface EntradaEdicao {
  id: string
  categoria: CategoriaEntradaTesouraria
  valorTexto: string
  observacao: string
}

interface SaidaEdicao {
  id: string
  diaBr: string
  solicitante: string
  prestador: string
  valorTexto: string
  observacao: string
}

function paraEdicaoEntrada(e: EntradaTesouraria): EntradaEdicao {
  return { id: e.id, categoria: e.categoria, valorTexto: numeroParaMoeda(e.valor), observacao: e.observacao ?? '' }
}

function paraEdicaoSaida(s: SaidaTesouraria): SaidaEdicao {
  return {
    id: s.id,
    diaBr: s.dia ? dataIsoParaBr(s.dia) : '',
    solicitante: s.solicitante,
    prestador: s.prestador,
    valorTexto: numeroParaMoeda(s.valor),
    observacao: s.observacao ?? '',
  }
}

function entradaVazia(e: EntradaEdicao): boolean {
  return !moedaParaNumero(e.valorTexto) && !e.observacao.trim()
}

function saidaVazia(s: SaidaEdicao): boolean {
  return !moedaParaNumero(s.valorTexto) && !s.diaBr.trim() && !s.solicitante.trim() && !s.prestador.trim() && !s.observacao.trim()
}

/** Remove entradas/saídas em branco (deixadas ao adicionar linhas a mais) e converte pro formato salvo. */
function limparEntradas(entradas: EntradaEdicao[]): EntradaTesouraria[] {
  return entradas
    .filter((e) => !entradaVazia(e))
    .map((e) => {
      const observacao = e.observacao.trim()
      return { id: e.id, categoria: e.categoria, valor: moedaParaNumero(e.valorTexto), ...(observacao ? { observacao } : {}) }
    })
}

function limparSaidas(saidas: SaidaEdicao[]): SaidaTesouraria[] {
  return saidas
    .filter((s) => !saidaVazia(s))
    .map((s) => {
      const observacao = s.observacao.trim()
      return {
        id: s.id,
        dia: dataBrParaIso(s.diaBr.trim()),
        solicitante: s.solicitante.trim(),
        prestador: s.prestador.trim(),
        valor: moedaParaNumero(s.valorTexto),
        ...(observacao ? { observacao } : {}),
      }
    })
}

export function ControleMensalPage() {
  const { competencia } = useParams<{ competencia: string }>()
  const navigate = useNavigate()

  const [controle, setControle] = React.useState<ControleTesouraria | null>(null)
  const [carregando, setCarregando] = React.useState(true)
  const [editando, setEditando] = React.useState(false)
  const [salvando, setSalvando] = React.useState(false)
  const [modalConfirmarSalvar, setModalConfirmarSalvar] = React.useState(false)

  const [entradasEdicao, setEntradasEdicao] = React.useState<EntradaEdicao[]>([])
  const [saidasEdicao, setSaidasEdicao] = React.useState<SaidaEdicao[]>([])
  const [statusEdicao, setStatusEdicao] = React.useState<StatusControleTesouraria>('em_andamento')

  React.useEffect(() => {
    if (!competencia) return
    setCarregando(true)
    obterOuCriarControleTesouraria(competencia)
      .then(setControle)
      .finally(() => setCarregando(false))
  }, [competencia])

  function iniciarEdicao() {
    if (!controle) return
    setEntradasEdicao(controle.entradas.map(paraEdicaoEntrada))
    setSaidasEdicao(controle.saidas.map(paraEdicaoSaida))
    setStatusEdicao(controle.status)
    setEditando(true)
  }

  function cancelarEdicao() {
    setEditando(false)
  }

  function adicionarEntrada() {
    setEntradasEdicao((atual) => [...atual, { id: crypto.randomUUID(), categoria: 'dizimo', valorTexto: '', observacao: '' }])
  }

  function removerEntrada(id: string) {
    setEntradasEdicao((atual) => atual.filter((e) => e.id !== id))
  }

  function atualizarEntrada(id: string, patch: Partial<EntradaEdicao>) {
    setEntradasEdicao((atual) => atual.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function adicionarSaida() {
    setSaidasEdicao((atual) => [
      ...atual,
      { id: crypto.randomUUID(), diaBr: '', solicitante: '', prestador: '', valorTexto: '', observacao: '' },
    ])
  }

  function removerSaida(id: string) {
    setSaidasEdicao((atual) => atual.filter((s) => s.id !== id))
  }

  function atualizarSaida(id: string, patch: Partial<SaidaEdicao>) {
    setSaidasEdicao((atual) => atual.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function handlePedirConfirmacaoSalvar() {
    const entradasPreenchidas = entradasEdicao.filter((e) => !entradaVazia(e))
    if (entradasPreenchidas.some((e) => moedaParaNumero(e.valorTexto) <= 0)) {
      toast.error('Há entrada(s) sem valor informado.')
      return
    }

    const saidasPreenchidas = saidasEdicao.filter((s) => !saidaVazia(s))
    const saidaIncompleta = saidasPreenchidas.some(
      (s) => !s.diaBr.trim() || !s.solicitante.trim() || !s.prestador.trim() || moedaParaNumero(s.valorTexto) <= 0,
    )
    if (saidaIncompleta) {
      toast.error('Há saída(s) com dia, solicitante, prestador ou valor faltando.')
      return
    }

    const saidaComDataInvalida = saidasPreenchidas.some((s) => !dataBrEhValida(s.diaBr.trim()))
    if (saidaComDataInvalida) {
      toast.error('Há saída(s) com data inválida. Use o formato dd/mm/aaaa.')
      return
    }

    setModalConfirmarSalvar(true)
  }

  async function handleConfirmarSalvar() {
    if (!competencia || !controle) return
    setSalvando(true)
    try {
      const entradas = limparEntradas(entradasEdicao)
      const saidas = limparSaidas(saidasEdicao)

      await salvarControleTesouraria(competencia, { status: statusEdicao, entradas, saidas })

      setControle({ ...controle, status: statusEdicao, entradas, saidas, atualizadoEm: new Date().toISOString() })
      setEditando(false)
      setModalConfirmarSalvar(false)
      toast.success('Controle salvo com sucesso.')
    } catch {
      toast.error('Não foi possível salvar o controle. Tente novamente.')
    } finally {
      setSalvando(false)
    }
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

  const totalEntradas = editando
    ? entradasEdicao.reduce((s, e) => s + moedaParaNumero(e.valorTexto), 0)
    : controle.entradas.reduce((s, e) => s + e.valor, 0)
  const totalSaidas = editando
    ? saidasEdicao.reduce((s, sa) => s + moedaParaNumero(sa.valorTexto), 0)
    : controle.saidas.reduce((s, sa) => s + sa.valor, 0)
  const saldo = totalEntradas - totalSaidas

  const totaisPorCategoria = CATEGORIAS_ENTRADA_TESOURARIA.map((cat) => ({
    label: cat.label,
    total: editando
      ? entradasEdicao
          .filter((e) => e.categoria === cat.value)
          .reduce((s, e) => s + moedaParaNumero(e.valorTexto), 0)
      : controle.entradas.filter((e) => e.categoria === cat.value).reduce((s, e) => s + e.valor, 0),
  })).filter((c) => c.total > 0)

  const statusExibido = editando ? statusEdicao : controle.status

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate(ROUTES.pastoral.tesouraria.root)}>
        <ArrowLeft className="h-4 w-4" />
        Voltar ao painel
      </Button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold capitalize tracking-tight text-foreground sm:text-2xl">
              {formatCompetencia(controle.competencia)}
            </h1>
            <StatusBadge label={STATUS_CONTROLE_TESOURARIA[statusExibido]} variant={statusExibido === 'fechado' ? 'muted' : 'success'} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Controle financeiro mensal da Tesouraria.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!editando && (
            <Button variant="outline" onClick={() => gerarPdfControleTesouraria(controle)}>
              <FileDown className="h-4 w-4" />
              Gerar PDF
            </Button>
          )}
          {editando ? (
            <>
              <Button variant="outline" onClick={cancelarEdicao} disabled={salvando}>
                Cancelar
              </Button>
              <Button onClick={handlePedirConfirmacaoSalvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          ) : (
            <Button onClick={iniciarEdicao}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total de entradas" value={formatCurrency(totalEntradas)} icon={TrendingUp} />
        <StatCard label="Total de saídas" value={formatCurrency(totalSaidas)} icon={TrendingDown} />
        <StatCard label="Saldo do mês" value={formatCurrency(saldo)} icon={Wallet} />
      </div>

      {editando && (
        <Card className="mb-6 max-w-xs">
          <CardContent className="space-y-1.5 pt-6">
            <Label htmlFor="status">Status do controle</Label>
            <Select value={statusEdicao} onValueChange={(v) => setStatusEdicao(v as StatusControleTesouraria)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {totaisPorCategoria.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Entradas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {totaisPorCategoria.map((c) => (
                <li key={c.label} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium text-foreground">{c.label}</span>
                  <span className="text-foreground">{formatCurrency(c.total)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Entradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editando ? (
            <>
              {entradasEdicao.map((e) => (
                <div key={e.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_9rem_1fr_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <Label>Categoria</Label>
                    <Select value={e.categoria} onValueChange={(v) => atualizarEntrada(e.id, { categoria: v as CategoriaEntradaTesouraria })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS_ENTRADA_TESOURARIA.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                      <Input
                        inputMode="decimal"
                        placeholder="0,00"
                        className="pl-9"
                        value={e.valorTexto}
                        onChange={(ev) => atualizarEntrada(e.id, { valorTexto: maskMoeda(ev.target.value) })}
                        onBlur={() => atualizarEntrada(e.id, { valorTexto: finalizarMoeda(e.valorTexto) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Observação</Label>
                    <Input
                      value={e.observacao}
                      onChange={(ev) => atualizarEntrada(e.id, { observacao: ev.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removerEntrada(e.id)} aria-label="Remover entrada">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={adicionarEntrada}>
                <Plus className="h-3.5 w-3.5" />
                Adicionar entrada
              </Button>
            </>
          ) : controle.entradas.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Nenhuma entrada lançada neste mês" />
          ) : (
            controle.entradas.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{categoriaEntradaLabel(e.categoria)}</p>
                  {e.observacao && <p className="mt-0.5 text-xs text-muted-foreground">{e.observacao}</p>}
                </div>
                <p className="shrink-0 font-medium text-success">{formatCurrency(e.valor)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saídas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editando ? (
            <>
              {saidasEdicao.map((s) => (
                <div key={s.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-[7rem_1fr_1fr_8rem_auto]">
                  <div className="space-y-1.5">
                    <Label>Dia</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="dd/mm/aaaa"
                      value={s.diaBr}
                      onChange={(ev) => atualizarSaida(s.id, { diaBr: maskDataBr(ev.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quem solicitou</Label>
                    <Input value={s.solicitante} onChange={(ev) => atualizarSaida(s.id, { solicitante: ev.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Empresa/Prestador</Label>
                    <Input value={s.prestador} onChange={(ev) => atualizarSaida(s.id, { prestador: ev.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                      <Input
                        inputMode="decimal"
                        placeholder="0,00"
                        className="pl-9"
                        value={s.valorTexto}
                        onChange={(ev) => atualizarSaida(s.id, { valorTexto: maskMoeda(ev.target.value) })}
                        onBlur={() => atualizarSaida(s.id, { valorTexto: finalizarMoeda(s.valorTexto) })}
                      />
                    </div>
                  </div>
                  <div className="flex items-end justify-end lg:justify-center">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removerSaida(s.id)} aria-label="Remover saída">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-5">
                    <Label>Observação</Label>
                    <Textarea
                      rows={2}
                      value={s.observacao}
                      onChange={(ev) => atualizarSaida(s.id, { observacao: ev.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={adicionarSaida}>
                <Plus className="h-3.5 w-3.5" />
                Adicionar saída
              </Button>
            </>
          ) : controle.saidas.length === 0 ? (
            <EmptyState icon={TrendingDown} title="Nenhuma saída lançada neste mês" />
          ) : (
            controle.saidas.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{s.prestador}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.dia ? dataIsoParaBr(s.dia) : '—'} · Solicitado por {s.solicitante}
                  </p>
                  {s.observacao && <p className="mt-0.5 text-xs text-muted-foreground">{s.observacao}</p>}
                </div>
                <p className="shrink-0 font-medium text-destructive">{formatCurrency(s.valor)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={modalConfirmarSalvar}
        onOpenChange={setModalConfirmarSalvar}
        title="Salvar controle mensal"
        description="Tem certeza que deseja salvar as alterações deste controle?"
        confirmLabel="Salvar"
        onConfirm={handleConfirmarSalvar}
      />
    </div>
  )
}
