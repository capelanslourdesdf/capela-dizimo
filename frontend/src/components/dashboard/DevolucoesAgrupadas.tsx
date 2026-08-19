import { ArrowLeftRight } from 'lucide-react'

import { EmptyState } from '@/components/dashboard/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { agruparDevolucoesPorCompetencia } from '@/services/devolucaoService'
import type { Devolucao } from '@/types'
import { formaPagamentoLabel } from '@/constants/devolucao'
import { formatCompetencia, formatCurrency, formatDate } from '@/utils/format'

interface DevolucoesAgrupadasProps {
  devolucoes: Devolucao[]
  vazioTitulo?: string
}

/**
 * Histórico de devoluções agrupado por mês. Um dizimista pode devolver mais de uma vez no mesmo
 * mês — agrupar deixa isso visível (quantas e quanto naquele mês) em vez de uma lista corrida
 * onde repetições no mesmo mês pareceriam estranhas.
 */
export function DevolucoesAgrupadas({ devolucoes, vazioTitulo = 'Nenhuma devolução registrada' }: DevolucoesAgrupadasProps) {
  if (devolucoes.length === 0) {
    return <EmptyState icon={ArrowLeftRight} title={vazioTitulo} />
  }

  const grupos = agruparDevolucoesPorCompetencia(devolucoes)

  return (
    <div className="space-y-5">
      {grupos.map((grupo) => (
        <div key={grupo.competencia}>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold capitalize text-foreground">{formatCompetencia(grupo.competencia)}</h3>
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
                  <Badge variant="outline" className="shrink-0">
                    {formaPagamentoLabel(d.formaPagamento)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
