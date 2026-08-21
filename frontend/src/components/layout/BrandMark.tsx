import { Church } from 'lucide-react'

import { cn } from '@/lib/utils'

interface BrandMarkProps {
  className?: string
  subtitle?: boolean
  /** Só o ícone, sem o nome — usado no menu lateral recolhido. */
  iconOnly?: boolean
}

export function BrandMark({ className, subtitle = true, iconOnly = false }: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Church className="h-5 w-5" />
      </span>
      {!iconOnly && (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-foreground sm:text-base">Meu Dízimo Digital</span>
          {subtitle && (
            <span className="whitespace-nowrap text-[11px] text-muted-foreground sm:text-xs">
            Capela Nossa Senhora de Lourdes
          </span>
          )}
        </span>
      )}
    </div>
  )
}
