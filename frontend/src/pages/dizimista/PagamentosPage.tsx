import * as React from 'react'
import { ArrowLeftRight, Receipt } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { useDizimistaSessao } from '@/hooks/useDizimistaSessao'
import { listarPagamentos } from '@/services/pagamentoService'
import { competenciaDaDevolucao, listarDevolucoes } from '@/services/devolucaoService'
import type { Devolucao, PagamentoPix, StatusPagamento } from '@/types'
import { formatCurrency, formatDate, formatCompetencia } from '@/utils/format'
import { formaPagamentoLabel } from '@/constants/devolucao'

const STATUS_CONFIG: Record<StatusPagamento, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  aprovado: { label: 'Pago', variant: 'success' },
  pendente: { label: 'Pendente', variant: 'warning' },
  rejeitado: { label: 'Não aprovado', variant: 'destructive' },
}

export function DizimistaPagamentosPage() {
  const { numeroCarne } = useDizimistaSessao()
  const [pagamentos, setPagamentos] = React.useState<PagamentoPix[]>([])
  const [devolucoes, setDevolucoes] = React.useState<Devolucao[]>([])
  const [carregando, setCarregando] = React.useState(true)

  React.useEffect(() => {
    if (!numeroCarne) return
    Promise.all([listarPagamentos(numeroCarne), listarDevolucoes(numeroCarne)]).then(([p, d]) => {
      setPagamentos(p)
      setDevolucoes(d)
      setCarregando(false)
    })
  }, [numeroCarne])

  return (
    <div>
      <PageHeader title="Meus pagamentos" description="Histórico de contribuições via Pix e devoluções recebidas." />

      <Tabs defaultValue="pagamentos">
        <TabsList>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="devolucoes">Devoluções</TabsTrigger>
        </TabsList>

        <TabsContent value="pagamentos">
          {carregando ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pagamentos.length === 0 ? (
            <EmptyState icon={Receipt} title="Nenhum pagamento ainda" description="Seus pagamentos via Pix aparecerão aqui." />
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
          {carregando ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : devolucoes.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="Nenhuma devolução registrada" />
          ) : (
            <div className="space-y-2.5">
              {devolucoes.map((d) => (
                <Card key={d.id}>
                  <CardContent className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{formatCurrency(d.valor)}</p>
                      <p className="text-xs text-muted-foreground">
                        Referente a {formatCompetencia(competenciaDaDevolucao(d))} ·{' '}
                        {formaPagamentoLabel(d.formaPagamento)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Lançado em {formatDate(d.criadoEm.slice(0, 10))}
                        {d.lancadoPor ? ` por ${d.lancadoPor}` : ''}
                      </p>
                      {d.observacao && <p className="mt-1 text-xs text-muted-foreground">{d.observacao}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
