import { Church } from 'lucide-react'

import { cn } from '@/lib/utils'

interface BrandMarkProps {
  className?: string
  /** Mostra a segunda linha ("Meu Dízimo Digital", quando `mostrarNome` também for true). */
  subtitle?: boolean
  /** Só o ícone, sem texto — usado no menu lateral recolhido. */
  iconOnly?: boolean
  /**
   * "Meu Dízimo Digital" é o nome do produto — só faz sentido dentro da área logada do
   * dizimista. Fora dela (site público, Pastoral, Tesouraria, telas de login) mostramos só o
   * ícone e "Capela Nossa Senhora de Lourdes", que é o texto principal da marca em qualquer
   * contexto.
   */
  mostrarNome?: boolean
}

export function BrandMark({ className, subtitle = true, iconOnly = false, mostrarNome = true }: BrandMarkProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Church className="h-5 w-5" />
      </span>
      {!iconOnly && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-semibold text-foreground sm:text-base">Capela Nossa Senhora de Lourdes</span>
          {subtitle && mostrarNome && (
            <span className="text-[11px] text-muted-foreground sm:text-xs">Meu Dízimo Digital</span>
          )}
        </span>
      )}
    </div>
  )
}
