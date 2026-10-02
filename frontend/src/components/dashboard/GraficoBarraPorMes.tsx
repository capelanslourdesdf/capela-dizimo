import * as React from 'react'

import { cn } from '@/lib/utils'
import { competenciaCurta, formatCompetencia, formatCurrency } from '@/utils/format'

export interface PontoBarraPorMes {
  competencia: string
  valor: number
}

interface GraficoBarraPorMesProps {
  /** Um ponto por mês, em ordem cronológica (mais antigo primeiro). */
  dados: PontoBarraPorMes[]
  tom?: 'success' | 'destructive' | 'primary'
}

const TOM_CLASSE: Record<'success' | 'destructive' | 'primary', string> = {
  success: 'bg-success',
  destructive: 'bg-destructive',
  primary: 'bg-primary',
}

/**
 * Gráfico de barras de uma série só (um valor por mês) — mesmo padrão do `GraficoEntradasSaidas`,
 * mas pra quando só interessa uma métrica (ex.: total de despesas por mês).
 */
export function GraficoBarraPorMes({ dados, tom = 'primary' }: GraficoBarraPorMesProps) {
  const [selecionada, setSelecionada] = React.useState<string | null>(null)
  const maximo = Math.max(1, ...dados.map((d) => d.valor))
  const pontoSelecionado = dados.find((d) => d.competencia === selecionada) ?? null

  return (
    <div>
      <div className="flex h-36 items-end gap-3 overflow-x-auto pb-1 sm:gap-4">
        {dados.map((ponto) => (
          <div key={ponto.competencia} className="flex h-full min-w-[2.75rem] flex-1 flex-col items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setSelecionada(ponto.competencia)}
              className={cn(
                'flex h-full w-full items-end justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selecionada === ponto.competencia && 'bg-accent/60',
              )}
              aria-label={`${competenciaCurta(ponto.competencia)}: ${formatCurrency(ponto.valor)}`}
            >
              <div
                className={cn('w-4 rounded-t-sm transition-all sm:w-5', ponto.valor > 0 ? TOM_CLASSE[tom] : 'bg-muted')}
                style={{ height: `${ponto.valor > 0 ? Math.max((ponto.valor / maximo) * 100, 4) : 0}%` }}
                title={formatCurrency(ponto.valor)}
              />
            </button>
            <span className="whitespace-nowrap text-[10px] text-muted-foreground">{competenciaCurta(ponto.competencia)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {pontoSelecionado
          ? `${formatCompetencia(pontoSelecionado.competencia)}: ${formatCurrency(pontoSelecionado.valor)}`
          : 'Toque num mês para ver o valor exato.'}
      </p>
    </div>
  )
}
