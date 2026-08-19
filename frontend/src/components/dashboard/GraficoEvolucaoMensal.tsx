import * as React from 'react'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/format'

const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface GraficoEvolucaoMensalProps {
  /** Total arrecadado em cada mês do ano, na ordem Jan..Dez (12 posições). */
  valoresPorMes: number[]
}

/**
 * Gráfico de barras simples, sem dependência externa — só o necessário pra ver a tendência do ano.
 * O valor exato de cada mês some no `title` (só funciona em hover) e num rótulo abaixo do gráfico,
 * que troca ao tocar/clicar numa barra — no celular não dá pra contar só com hover.
 */
export function GraficoEvolucaoMensal({ valoresPorMes }: GraficoEvolucaoMensalProps) {
  const [selecionado, setSelecionado] = React.useState<number | null>(null)
  const maximo = Math.max(1, ...valoresPorMes)

  return (
    <div>
      <div className="flex h-32 items-end gap-1 sm:gap-2">
        {valoresPorMes.map((valor, indice) => {
          const alturaPercentual = valor > 0 ? Math.max((valor / maximo) * 100, 4) : 0

          return (
            <div key={NOMES_MESES[indice]} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setSelecionado(indice)}
                className="flex h-full w-full items-end rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={formatCurrency(valor)}
                aria-label={`${NOMES_MESES[indice]}: ${formatCurrency(valor)}`}
              >
                <div
                  className={cn(
                    'w-full rounded-t-sm transition-all',
                    valor > 0 ? 'bg-primary' : 'bg-muted',
                    selecionado === indice && valor > 0 && 'ring-2 ring-primary ring-offset-1',
                  )}
                  style={{ height: `${alturaPercentual}%` }}
                />
              </button>
              <span className="text-[10px] text-muted-foreground">{NOMES_MESES[indice]}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {selecionado !== null
          ? `${NOMES_MESES[selecionado]}: ${formatCurrency(valoresPorMes[selecionado])}`
          : 'Toque numa barra para ver o valor exato.'}
      </p>
    </div>
  )
}
