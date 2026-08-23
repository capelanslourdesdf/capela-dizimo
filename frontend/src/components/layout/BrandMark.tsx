import { Church } from 'lucide-react'

import { cn } from '@/lib/utils'

interface BrandMarkProps {
  className?: string
  /** Só o ícone, sem texto — usado no menu lateral recolhido. */
  iconOnly?: boolean
}

/**
 * Marca do site: ícone + "Capela Nossa Senhora de Lourdes", sempre — não leva "Meu Dízimo
 * Digital" (nome do produto). Esse nome só aparece dentro da área logada do dizimista, fora da
 * BrandMark (ex.: um botão futuro na Home).
 */
export function BrandMark({ className, iconOnly = false }: BrandMarkProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Church className="h-5 w-5" />
      </span>
      {!iconOnly && (
        <span className="min-w-0 text-sm font-semibold text-foreground sm:text-base">Capela Nossa Senhora de Lourdes</span>
      )}
    </div>
  )
}
