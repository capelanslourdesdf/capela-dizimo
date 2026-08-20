import type { ReactNode } from 'react'

import { useDefinirPageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  /**
   * Título mostrado no topo fixo do celular, se diferente de `title` — usado quando o título da
   * tela é uma saudação ou algo muito específico (ex.: "Olá, Fulano"), pra não repetir o mesmo
   * texto duas vezes na tela. Sem isso, o topo usa `title` mesmo.
   */
  topTitle?: string
}

export function PageHeader({ title, description, actions, topTitle }: PageHeaderProps) {
  useDefinirPageTitle(topTitle ?? title)

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {/* No celular o topo fixo já mostra esse mesmo título (ver AppTopbar) — repetir aqui só
            quando `topTitle` for diferente, senão fica duplicado. */}
        <h1
          className={cn(
            'text-xl font-semibold tracking-tight text-foreground sm:text-2xl',
            !topTitle && 'hidden lg:block',
          )}
        >
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
