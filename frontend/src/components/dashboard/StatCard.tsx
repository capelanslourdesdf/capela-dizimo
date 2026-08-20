import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  trend?: { valor: string; positivo: boolean }
  helper?: string
  /**
   * Versão enxuta para telas pequenas: some com o ícone e reduz espaçamento/fonte, para que
   * valores como "R$ 1.234,56" ou "Agosto de 2026" caibam em uma única linha no mobile.
   */
  compact?: boolean
}

export function StatCard({ label, value, icon: Icon, trend, helper, compact = false }: StatCardProps) {
  return (
    <Card>
      <CardContent
        className={cn('flex items-start justify-between gap-2 p-4 sm:p-5', compact && 'p-3 sm:p-5')}
      >
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs text-muted-foreground sm:text-sm', compact && 'text-[11px] sm:text-sm')}>{label}</p>
          <p
            className={cn(
              'mt-1 text-lg font-semibold leading-tight text-foreground sm:text-xl',
              compact && 'text-base sm:text-xl',
            )}
          >
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                'mt-1.5 inline-flex items-center gap-1 text-xs font-medium',
                trend.positivo ? 'text-success' : 'text-destructive',
              )}
            >
              {trend.positivo ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {trend.valor}
            </p>
          )}
          {helper && !trend && <p className="mt-1.5 text-xs text-muted-foreground">{helper}</p>}
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary',
            compact && 'hidden sm:flex',
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  )
}
