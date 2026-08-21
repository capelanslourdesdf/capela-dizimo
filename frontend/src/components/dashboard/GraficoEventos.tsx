import * as React from 'react'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/format'

export interface PontoEvento {
  nome: string
  arrecadado: number
  despesa: number
}

interface GraficoEventosProps {
  /** Um ponto por evento (já agrupado por nome), em qualquer ordem. */
  dados: PontoEvento[]
}

/**
 * Gráfico de barras pareadas (arrecadado x despesa) por evento — mesmo padrão visual do gráfico
 * de entradas/saídas da Tesouraria, só que agrupado por nome de evento em vez de por mês.
 */
export function GraficoEventos({ dados }: GraficoEventosProps) {
  const [selecionado, setSelecionado] = React.useState<string | null>(null)
  const maximo = Math.max(1, ...dados.flatMap((d) => [d.arrecadado, d.despesa]))
  const pontoSelecionado = dados.find((d) => d.nome === selecionado) ?? null

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-success" />
          Arrecadado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-destructive" />
          Despesa
        </span>
      </div>
      <div className="flex h-36 items-end gap-3 overflow-x-auto pb-1 sm:gap-4">
        {dados.map((ponto) => (
          <div key={ponto.nome} className="flex h-full min-w-[3.5rem] flex-1 flex-col items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setSelecionado(ponto.nome)}
              className={cn(
                'flex h-full w-full items-end justify-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selecionado === ponto.nome && 'bg-accent/60',
              )}
              aria-label={`${ponto.nome}: arrecadado ${formatCurrency(ponto.arrecadado)}, despesa ${formatCurrency(ponto.despesa)}`}
            >
              <div
                className={cn('w-3 rounded-t-sm transition-all sm:w-3.5', ponto.arrecadado > 0 ? 'bg-success' : 'bg-muted')}
                style={{ height: `${ponto.arrecadado > 0 ? Math.max((ponto.arrecadado / maximo) * 100, 4) : 0}%` }}
                title={`Arrecadado: ${formatCurrency(ponto.arrecadado)}`}
              />
              <div
                className={cn('w-3 rounded-t-sm transition-all sm:w-3.5', ponto.despesa > 0 ? 'bg-destructive' : 'bg-muted')}
                style={{ height: `${ponto.despesa > 0 ? Math.max((ponto.despesa / maximo) * 100, 4) : 0}%` }}
                title={`Despesa: ${formatCurrency(ponto.despesa)}`}
              />
            </button>
            <span className="max-w-[4.5rem] truncate text-[10px] text-muted-foreground" title={ponto.nome}>
              {ponto.nome}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {pontoSelecionado
          ? `${pontoSelecionado.nome} — Arrecadado: ${formatCurrency(pontoSelecionado.arrecadado)} · Despesa: ${formatCurrency(pontoSelecionado.despesa)}`
          : 'Toque num evento para ver os valores exatos.'}
      </p>
    </div>
  )
}
