import * as React from 'react'
import { Pencil, PartyPopper, Plus, TrendingDown, TrendingUp, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatCard } from '@/components/dashboard/StatCard'
import { EventoTesourariaForm } from '@/components/forms/EventoTesourariaForm'
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
        description="Total arrecadado e despesas por evento, ano a ano."
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
        <div className="space-y-3">
          {eventos.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{e.nome}</p>
                    {e.data && <span className="text-xs text-muted-foreground">{formatDate(e.data)}</span>}
                  </div>
                  {e.observacao && <p className="mt-0.5 text-xs text-muted-foreground">{e.observacao}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Arrecadado: {formatCurrency(e.arrecadado)}</span>
                    <span>Despesa: {formatCurrency(e.despesa)}</span>
                    <span className="font-medium text-foreground">Saldo: {formatCurrency(e.arrecadado - e.despesa)}</span>
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
                      aria-label={`Excluir ${e.nome}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
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
        description={`Tem certeza que deseja excluir o evento "${eventoParaExcluir?.nome ?? ''}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={handleExcluir}
      />
    </div>
  )
}
