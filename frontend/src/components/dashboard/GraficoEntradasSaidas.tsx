import * as React from 'react'

import { cn } from '@/lib/utils'
import { competenciaCurta, formatCompetencia, formatCurrency } from '@/utils/format'

export interface PontoEntradasSaidas {
  competencia: string
  entradas: number
  saidas: number
}

interface GraficoEntradasSaidasProps {
  /** Um ponto por mês, em ordem cronológica (mais antigo primeiro). */
  dados: PontoEntradasSaidas[]
}

/**
 * Gráfico de barras pareadas (entradas x saídas) por mês, sem dependência externa. Os valores
 * exatos ficam no `title` (só funciona em hover) e num rótulo abaixo do gráfico, que troca ao
 * tocar/clicar num mês — no celular não dá pra contar só com hover.
 */
export function GraficoEntradasSaidas({ dados }: GraficoEntradasSaidasProps) {
  const [selecionada, setSelecionada] = React.useState<string | null>(null)
  const maximo = Math.max(1, ...dados.flatMap((d) => [d.entradas, d.saidas]))
  const pontoSelecionado = dados.find((d) => d.competencia === selecionada) ?? null

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-success" />
          Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-destructive" />
          Saídas
        </span>
      </div>
      <div className="flex h-36 items-end gap-3 overflow-x-auto pb-1 sm:gap-4">
        {dados.map((ponto) => (
          <div key={ponto.competencia} className="flex h-full min-w-[2.75rem] flex-1 flex-col items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setSelecionada(ponto.competencia)}
              className={cn(
                'flex h-full w-full items-end justify-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selecionada === ponto.competencia && 'bg-accent/60',
              )}
              aria-label={`${competenciaCurta(ponto.competencia)}: entradas ${formatCurrency(ponto.entradas)}, saídas ${formatCurrency(ponto.saidas)}`}
            >
              <div
                className={cn('w-3 rounded-t-sm transition-all sm:w-3.5', ponto.entradas > 0 ? 'bg-success' : 'bg-muted')}
                style={{ height: `${ponto.entradas > 0 ? Math.max((ponto.entradas / maximo) * 100, 4) : 0}%` }}
                title={`Entradas: ${formatCurrency(ponto.entradas)}`}
              />
              <div
                className={cn('w-3 rounded-t-sm transition-all sm:w-3.5', ponto.saidas > 0 ? 'bg-destructive' : 'bg-muted')}
                style={{ height: `${ponto.saidas > 0 ? Math.max((ponto.saidas / maximo) * 100, 4) : 0}%` }}
                title={`Saídas: ${formatCurrency(ponto.saidas)}`}
              />
            </button>
            <span className="whitespace-nowrap text-[10px] text-muted-foreground">{competenciaCurta(ponto.competencia)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {pontoSelecionado
          ? `${formatCompetencia(pontoSelecionado.competencia)} — Entradas: ${formatCurrency(pontoSelecionado.entradas)} · Saídas: ${formatCurrency(pontoSelecionado.saidas)}`
          : 'Toque num mês para ver os valores exatos.'}
      </p>
    </div>
  )
}
