import type { ReactNode } from 'react'

import { usePageTitle } from '@/hooks/usePageTitle'

interface AppTopbarProps {
  areaLabel: string
  userMenu: ReactNode
}

export function AppTopbar({ areaLabel, userMenu }: AppTopbarProps) {
  const tituloDaTela = usePageTitle()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-8">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-foreground sm:text-lg lg:hidden">
          {tituloDaTela || 'Meu Dízimo Digital'}
        </p>
        <p className="hidden truncate text-sm font-medium text-muted-foreground lg:block">{areaLabel}</p>
      </div>

      {userMenu}
    </header>
  )
}
