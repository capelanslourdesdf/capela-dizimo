import type { ReactNode } from 'react'

import { useDefinirPageTitle } from '@/hooks/usePageTitle'

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
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
