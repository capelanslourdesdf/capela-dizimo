import { ArrowLeftRight, Pencil } from 'lucide-react'

import { EmptyState } from '@/components/dashboard/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { agruparDevolucoesPorCompetencia } from '@/services/devolucaoService'
import type { Devolucao } from '@/types'
import { formaPagamentoLabel } from '@/constants/devolucao'
import { formatCompetencia, formatCurrency, formatDate } from '@/utils/format'

interface DevolucoesAgrupadasProps {
  devolucoes: Devolucao[]
  vazioTitulo?: string
  /** Só informado na área da Pastoral — quando presente, mostra o botão de editar cada lançamento. */
  onEditar?: (devolucao: Devolucao) => void
}

/**
 * Histórico de devoluções agrupado por mês. Um dizimista pode devolver mais de uma vez no mesmo
 * mês — agrupar deixa isso visível (quantas e quanto naquele mês) em vez de uma lista corrida
 * onde repetições no mesmo mês pareceriam estranhas.
 */
export function DevolucoesAgrupadas({
  devolucoes,
  vazioTitulo = 'Nenhuma devolução registrada',
  onEditar,
}: DevolucoesAgrupadasProps) {
  if (devolucoes.length === 0) {
    return <EmptyState icon={ArrowLeftRight} title={vazioTitulo} />
  }

  const grupos = agruparDevolucoesPorCompetencia(devolucoes)

  return (
    <div className="space-y-5">
      {grupos.map((grupo) => (
        <div key={grupo.competencia}>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">{formatCompetencia(grupo.competencia)}</h3>
            <span className="shrink-0 text-xs text-muted-foreground">
              {grupo.devolucoes.length > 1 ? `${grupo.devolucoes.length} devoluções · ` : ''}
              {formatCurrency(grupo.total)}
            </span>
          </div>
          <div className="space-y-2.5">
            {grupo.devolucoes.map((d) => (
              <Card key={d.id}>
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{formatCurrency(d.valor)}</p>
                    <p className="text-xs text-muted-foreground">
                      Lançado em {formatDate(d.criadoEm.slice(0, 10))}
                      {d.lancadoPor ? ` por ${d.lancadoPor}` : ''}
                    </p>
                    {d.observacao && <p className="mt-1 text-xs text-muted-foreground">{d.observacao}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{formaPagamentoLabel(d.formaPagamento)}</Badge>
                    {onEditar && (
                      <Button variant="ghost" size="icon" onClick={() => onEditar(d)} aria-label="Editar devolução">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
