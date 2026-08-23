import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

import { Input } from '@/components/ui/input'

interface FiltroBarProps {
  busca: string
  onBuscaChange: (valor: string) => void
  placeholder?: string
  children?: ReactNode
}

export function FiltroBar({ busca, onBuscaChange, placeholder = 'Buscar...', children }: FiltroBarProps) {
  return (
    <div className="mb-4 mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}
