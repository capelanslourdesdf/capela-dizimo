import * as React from 'react'
import { Pencil, PartyPopper, Plus, TrendingDown, TrendingUp, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatCard } from '@/components/dashboard/StatCard'
import { GraficoEventos } from '@/components/dashboard/GraficoEventos'
import { EventoTesourariaForm } from '@/components/forms/EventoTesourariaForm'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

import {
  atualizarEventoTesouraria,
  criarEventoTesouraria,
  excluirEventoTesouraria,
  listarEventosTesouraria,
  type DadosEventoTesouraria,
} from '@/services/tesourariaService'
import type { EventoTesouraria } from '@/types'
import { ANO_INICIAL_EVENTOS_TESOURARIA } from '@/constants/tesouraria'
import { formatCurrency, formatDate } from '@/utils/format'
import { useTesourariaSessao } from '@/hooks/useTesourariaSessao'

const anoAtual = new Date().getFullYear()
const ANOS_DISPONIVEIS = Array.from(
  { length: Math.max(anoAtual + 1 - ANO_INICIAL_EVENTOS_TESOURARIA + 1, 1) },
  (_, i) => ANO_INICIAL_EVENTOS_TESOURARIA + i,
)

interface GrupoEvento {
  nome: string
  arrecadado: number
  despesa: number
  ocorrencias: EventoTesouraria[]
}

/** Agrupa lançamentos de mesmo nome (ex.: "Bazar" lançado em vários meses do ano) num só bloco. */
function agruparEventosPorNome(eventos: EventoTesouraria[]): GrupoEvento[] {
  const porNome = new Map<string, EventoTesouraria[]>()
  for (const evento of eventos) {
    const lista = porNome.get(evento.nome) ?? []
    lista.push(evento)
    porNome.set(evento.nome, lista)
  }

  return [...porNome.entries()]
    .map(([nome, ocorrencias]) => ({
      nome,
      arrecadado: ocorrencias.reduce((s, e) => s + e.arrecadado, 0),
      despesa: ocorrencias.reduce((s, e) => s + e.despesa, 0),
      ocorrencias: [...ocorrencias].sort((a, b) => (a.data < b.data ? 1 : -1)),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export function EventosPage() {
  const { podeEditar } = useTesourariaSessao()
  const [ano, setAno] = React.useState(Math.max(anoAtual, ANO_INICIAL_EVENTOS_TESOURARIA))
  const [eventos, setEventos] = React.useState<EventoTesouraria[]>([])
  const [carregando, setCarregando] = React.useState(true)
  const [modalAberto, setModalAberto] = React.useState(false)
  const [eventoEmEdicao, setEventoEmEdicao] = React.useState<EventoTesouraria | null>(null)
  const [eventoParaExcluir, setEventoParaExcluir] = React.useState<EventoTesouraria | null>(null)

  const carregar = React.useCallback(async () => {
    setCarregando(true)
    const todos = await listarEventosTesouraria(ano)
    setEventos(todos)
    setCarregando(false)
  }, [ano])

  React.useEffect(() => {
    carregar()
  }, [carregar])

  const totalArrecadado = React.useMemo(() => eventos.reduce((s, e) => s + e.arrecadado, 0), [eventos])
  const totalDespesa = React.useMemo(() => eventos.reduce((s, e) => s + e.despesa, 0), [eventos])
  const grupos = React.useMemo(() => agruparEventosPorNome(eventos), [eventos])

  function handleNovo() {
    setEventoEmEdicao(null)
    setModalAberto(true)
  }

  function handleEditar(evento: EventoTesouraria) {
    setEventoEmEdicao(evento)
    setModalAberto(true)
  }

  async function handleSalvar(dados: DadosEventoTesouraria) {
    if (eventoEmEdicao) {
      await atualizarEventoTesouraria(eventoEmEdicao.id, dados)
      toast.success('Evento atualizado com sucesso.')
    } else {
      await criarEventoTesouraria(dados)
      toast.success('Evento lançado com sucesso.')
    }
    setModalAberto(false)
    setEventoEmEdicao(null)
    carregar()
  }

  async function handleExcluir() {
    if (!eventoParaExcluir) return
    try {
      await excluirEventoTesouraria(eventoParaExcluir.id)
      toast.success(`Evento "${eventoParaExcluir.nome}" excluído.`)
      setEventoParaExcluir(null)
      carregar()
    } catch {
      toast.error('Não foi possível excluir o evento. Tente novamente.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Eventos"
        description="Total arrecadado e despesas por evento, ano a ano — eventos de mesmo nome ficam agrupados."
        actions={
          <>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANOS_DISPONIVEIS.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {podeEditar && (
              <Button onClick={handleNovo}>
                <Plus className="h-4 w-4" />
                Novo evento
              </Button>
            )}
          </>
        }
      />

      {carregando ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          <StatCard compact tom="success" label="Total arrecadado" value={formatCurrency(totalArrecadado)} icon={TrendingUp} />
          <StatCard compact tom="destructive" label="Total de despesas" value={formatCurrency(totalDespesa)} icon={TrendingDown} />
          <StatCard compact label="Saldo do ano" value={formatCurrency(totalArrecadado - totalDespesa)} icon={Wallet} />
        </div>
      )}

      {carregando ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : eventos.length === 0 ? (
        <EmptyState icon={PartyPopper} title={`Nenhum evento lançado em ${ano}`} />
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="pt-6">
              <GraficoEventos dados={grupos} />
            </CardContent>
          </Card>

          <div className="space-y-3">
            {grupos.map((grupo) => (
              <Card key={grupo.nome}>
                <Accordion type="single" collapsible>
                  <AccordionItem value={grupo.nome} className="border-b-0">
                    <AccordionTrigger className="px-5 py-5 hover:no-underline sm:px-6 sm:py-6">
                      <div className="flex items-center gap-2 text-left">
                        <PartyPopper className="h-4 w-4 shrink-0 text-primary" />
                        <div>
                          <p className="font-semibold leading-none tracking-tight text-foreground">{grupo.nome}</p>
                          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm font-normal text-muted-foreground">
                            <span>
                              {grupo.ocorrencias.length > 1
                                ? `${grupo.ocorrencias.length} lançamentos`
                                : '1 lançamento'}
                            </span>
                            <span className="text-success">Arrecadado: {formatCurrency(grupo.arrecadado)}</span>
                            <span className="text-destructive">Despesa: {formatCurrency(grupo.despesa)}</span>
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2.5 px-5 pb-5 sm:px-6 sm:pb-6">
                      {grupo.ocorrencias.map((e) => (
                        <div
                          key={e.id}
                          className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {e.data ? formatDate(e.data) : 'Sem data informada'}
                            </p>
                            {e.observacao && <p className="mt-0.5 text-xs text-muted-foreground">{e.observacao}</p>}
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>Arrecadado: {formatCurrency(e.arrecadado)}</span>
                              <span>Despesa: {formatCurrency(e.despesa)}</span>
                            </div>
                          </div>
                          {podeEditar && (
                            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                              <Button variant="outline" size="sm" onClick={() => handleEditar(e)}>
                                <Pencil className="h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setEventoParaExcluir(e)}
                                aria-label={`Excluir lançamento de ${e.nome} em ${e.data ? formatDate(e.data) : ''}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{eventoEmEdicao ? 'Editar evento' : 'Novo evento'}</DialogTitle>
          </DialogHeader>
          <EventoTesourariaForm
            key={eventoEmEdicao?.id ?? 'novo'}
            evento={eventoEmEdicao ?? undefined}
            anoPadrao={ano}
            onSalvar={handleSalvar}
            onCancelar={() => setModalAberto(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!eventoParaExcluir}
        onOpenChange={(open) => !open && setEventoParaExcluir(null)}
        title="Excluir evento"
        description={`Tem certeza que deseja excluir esse lançamento de "${eventoParaExcluir?.nome ?? ''}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={handleExcluir}
      />
    </div>
  )
}
