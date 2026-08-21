import * as React from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { competenciaAtual, formatCompetencia } from '@/utils/format'

const NOMES_MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface MesAnoPickerProps {
  /** Competência selecionada ("aaaa-mm"). */
  value: string
  onChange: (competencia: string) => void
  className?: string
}

/**
 * Seletor de mês/ano em forma de calendário — mais intuitivo que digitar "mm/aaaa" na mão,
 * especialmente pra quem não usa muito o celular. Mostra um ano por vez, com os 12 meses num
 * grid; clicar num mês já seleciona e fecha.
 */
export function MesAnoPicker({ value, onChange, className }: MesAnoPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [anoDoValor, mesDoValor] = value ? value.split('-').map(Number) : [Number(competenciaAtual().slice(0, 4)), 0]
  const [anoExibido, setAnoExibido] = React.useState(anoDoValor)

  // Sempre que o popover reabre, volta a mostrar o ano do valor atual (não o último ano navegado).
  React.useEffect(() => {
    if (open) setAnoExibido(anoDoValor)
  }, [open, anoDoValor])

  function handleSelecionarMes(indiceMes: number) {
    const competencia = `${anoExibido}-${String(indiceMes + 1).padStart(2, '0')}`
    onChange(competencia)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('h-12 w-full justify-start text-left text-base font-normal', className)}
        >
          <CalendarDays className="h-5 w-5 shrink-0 text-muted-foreground" />
          {value ? formatCompetencia(value) : 'Selecione o mês'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="mb-3 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setAnoExibido((a) => a - 1)}
            aria-label="Ano anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-semibold text-foreground">{anoExibido}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setAnoExibido((a) => a + 1)}
            aria-label="Próximo ano"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {NOMES_MESES_CURTO.map((nome, indice) => {
            const selecionado = anoExibido === anoDoValor && indice === mesDoValor - 1
            return (
              <button
                key={nome}
                type="button"
                onClick={() => handleSelecionarMes(indice)}
                className={cn(
                  'rounded-lg py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent',
                  selecionado && 'bg-primary text-primary-foreground hover:bg-primary',
                )}
              >
                {nome}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
