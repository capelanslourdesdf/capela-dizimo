import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, type DayButtonProps } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

/** Botão de um dia — repassa o ref pro DayPicker conseguir focar o dia certo ao navegar pelo teclado. */
function DiaBotao({ className, day: _day, modifiers: _modifiers, ...props }: DayButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (props.autoFocus) ref.current?.focus()
  }, [props.autoFocus])

  return <button ref={ref} type="button" className={className} {...props} />
}

/** Calendário para escolher uma data — usado dentro de um Popover pelos campos de data do site (ver CampoData). */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      captionLayout="dropdown"
      className={cn('p-3', className)}
      classNames={{
        root: 'w-fit',
        months: 'flex flex-col gap-4',
        month: 'flex flex-col gap-3',
        month_caption: 'flex items-center justify-center gap-2 pt-1 px-9',
        caption_label: 'pointer-events-none flex items-center gap-1 text-sm font-medium capitalize',
        dropdowns: 'flex items-center gap-1.5',
        dropdown_root: 'relative inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1.5 hover:bg-accent',
        dropdown: 'absolute inset-0 opacity-0 cursor-pointer',
        months_dropdown: '',
        years_dropdown: '',
        nav: 'flex items-center justify-between absolute inset-x-1 top-1',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse mt-2',
        weekdays: 'flex',
        weekday: 'text-muted-foreground w-9 font-normal text-xs',
        week: 'flex w-full mt-1.5',
        day: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected])]:bg-primary/10 first:[&:has([data-selected])]:rounded-l-md last:[&:has([data-selected])]:rounded-r-md',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md',
        ),
        today: '[&>button]:bg-accent [&>button]:text-accent-foreground',
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
        outside: 'text-muted-foreground/40 aria-selected:text-muted-foreground',
        disabled: 'text-muted-foreground/40 opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
        DayButton: DiaBotao,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
