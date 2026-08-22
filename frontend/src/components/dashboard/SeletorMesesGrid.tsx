import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import { competenciaAtual } from '@/utils/format'

const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface SeletorMesesGridProps {
  ano: number
  /** Competências ("aaaa-mm") com devolução já lançada — não podem ser escolhidas de novo. */
  competenciasPagas: Set<string>
  selecionados: Set<string>
  onAlternar: (competencia: string) => void
}

/**
 * Mesma grade visual do MesesGrid (dashboard), mas interativa: meses já devolvidos ficam travados
 * com o selo "Devolvido"; pendentes e futuros podem ser escolhidos, um ou mais, para a devolução.
 */
export function SeletorMesesGrid({ ano, competenciasPagas, selecionados, onAlternar }: SeletorMesesGridProps) {
  const atual = competenciaAtual()

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {NOMES_MESES.map((nome, indice) => {
          const competencia = `${ano}-${String(indice + 1).padStart(2, '0')}`
          const pago = competenciasPagas.has(competencia)
          const futuro = competencia > atual
          const selecionado = selecionados.has(competencia)

          if (pago) {
            return (
              <div
                key={competencia}
                className="relative flex flex-col items-center justify-center gap-0.5 rounded-lg border border-success/30 bg-success/10 py-3 text-sm font-medium text-success"
              >
                {nome}
                <span style={{ border: '1px solid #fff' }} className="absolute -top-2 right-1 rounded-full bg-success px-1.5 py-0.5 text-[10px] font-semibold leading-none text-success-foreground shadow-sm">
                  Devolvido
                </span>
              </div>
            )
          }

          return (
            <button
              key={competencia}
              type="button"
              onClick={() => onAlternar(competencia)}
              aria-pressed={selecionado}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 rounded-lg border py-3 text-sm font-medium transition-colors',
                selecionado && 'border-primary bg-primary text-primary-foreground',
                !selecionado && futuro && 'border-border bg-background text-foreground hover:border-primary/50',
                !selecionado &&
                  !futuro &&
                  'border-warning/30 bg-warning/15 text-warning-foreground hover:border-warning',
              )}
            >
              {selecionado && (
                <span style={{ border: '1px solid #fff' }} className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Check className="h-3 w-3" />
                </span>
              )}
              {nome}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          Devolvido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-warning" />
          Pendente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          Selecionado para pagar
        </span>
      </div>
    </div>
  )
}
