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
}

export function StatCard({ label, value, icon: Icon, trend, helper }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
          <p className="mt-1 break-words text-lg font-semibold leading-tight text-foreground sm:text-xl">{value}</p>
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  )
}
