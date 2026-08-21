import { cn } from '@/lib/utils'
import { competenciaAtual } from '@/utils/format'

const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface MesesGridProps {
  ano: number
  /** Competências ("aaaa-mm") com devolução lançada. */
  competenciasPagas: Set<string>
}

/** Mês passado ou atual é Devolvido ou Pendente; mês futuro fica neutro (Não aplicável). */
export function MesesGrid({ ano, competenciasPagas }: MesesGridProps) {
  const atual = competenciaAtual()

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {NOMES_MESES.map((nome, indice) => {
          const competencia = `${ano}-${String(indice + 1).padStart(2, '0')}`
          const futuro = competencia > atual
          const pago = competenciasPagas.has(competencia)

          return (
            <div
              key={competencia}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-lg border py-3 text-xs font-medium',
                futuro && 'border-border bg-muted text-muted-foreground',
                !futuro && pago && 'border-success/30 bg-success/10 text-success',
                !futuro && !pago && 'border-warning/30 bg-warning/15 text-warning-foreground',
              )}
            >
              {nome}
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          Devolvido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-warning" />
          Pendente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
          Não aplicável
        </span>
      </div>
    </div>
  )
}
