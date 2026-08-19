import { cn } from '@/lib/utils'
import { competenciaAtual } from '@/utils/format'

const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface MesesGridProps {
  ano: number
  /** Competência ("aaaa-mm") em que o dizimista passou a ser acompanhado — meses antes dela ficam neutros. */
  registro?: string
  /** Competências ("aaaa-mm") com devolução lançada. */
  competenciasPagas: Set<string>
}

export function MesesGrid({ ano, registro, competenciasPagas }: MesesGridProps) {
  const competenciaHoje = competenciaAtual()

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {NOMES_MESES.map((nome, indice) => {
          const competencia = `${ano}-${String(indice + 1).padStart(2, '0')}`
          const pago = competenciasPagas.has(competencia)
          // Um mês com devolução lançada aparece como "Devolvido" mesmo fora da janela normal
          // (ex.: devolução retroativa a um mês anterior ao recadastramento) — a lançada por lote
          // ou avulsa não fica escondida só porque, em tese, "não contaria" no cálculo de status.
          const aplicavel = pago || ((!registro || competencia >= registro) && competencia <= competenciaHoje)

          return (
            <div
              key={competencia}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-lg border py-3 text-xs font-medium',
                !aplicavel && 'border-border bg-muted text-muted-foreground/60',
                aplicavel && pago && 'border-success/30 bg-success/10 text-success',
                aplicavel && !pago && 'border-warning/30 bg-warning/15 text-warning-foreground',
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
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
          Não aplicável
        </span>
      </div>
    </div>
  )
}
