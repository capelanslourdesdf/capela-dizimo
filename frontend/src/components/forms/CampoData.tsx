import * as React from 'react'
import { CalendarIcon } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { maskDataBr } from '@/utils/format'
import { cn } from '@/lib/utils'

/**
 * "dd/mm/aaaa" -> Date local (meia-noite no fuso do navegador, sem passar por string ISO — evitar
 * isso é o que evita o clássico bug de fuso horário em que a data volta um dia).
 */
function dataBrParaDateLocal(valor: string): Date | undefined {
  const match = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return undefined
  const [, diaStr, mesStr, anoStr] = match
  const dia = Number(diaStr)
  const mes = Number(mesStr)
  const ano = Number(anoStr)
  const data = new Date(ano, mes - 1, dia)
  // Rejeita datas que "estouram" o mês (ex.: 31/02 viraria 03/03) em vez de aceitar silenciosamente.
  if (data.getDate() !== dia || data.getMonth() !== mes - 1 || data.getFullYear() !== ano) return undefined
  return data
}

function dateParaDataBrLocal(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${data.getFullYear()}`
}

interface CampoDataProps {
  id: string
  value: string
  onChange: (valor: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Datas que não podem ser escolhidas no calendário (ex.: não deixar escolher uma data futura). Não afeta o que pode ser digitado — só o que aparece clicável no calendário. */
  diasDesabilitados?: (data: Date) => boolean
}

/**
 * Campo de data com dois jeitos de preencher: digitar direto (dd/mm/aaaa, com a mesma máscara de
 * sempre) ou abrir o calendário pelo ícone e escolher a data — sem perder a digitação rápida pra
 * quem já sabe a data de cor, mas com um jeito visual de selecionar pra quem prefere.
 */
export function CampoData({ id, value, onChange, placeholder = 'dd/mm/aaaa', disabled, className, diasDesabilitados }: CampoDataProps) {
  const [aberto, setAberto] = React.useState(false)
  const dataSelecionada = dataBrParaDateLocal(value)

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(maskDataBr(e.target.value))}
          className={cn('pr-10', className)}
        />
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            aria-label="Abrir calendário para escolher a data"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dataSelecionada}
          defaultMonth={dataSelecionada}
          disabled={diasDesabilitados}
          onSelect={(data) => {
            if (!data) return
            onChange(dateParaDataBrLocal(data))
            setAberto(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
