import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { BrandMark } from '@/components/layout/BrandMark'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { NavItem } from '@/constants/nav'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

interface AppSidebarProps {
  navItems: NavItem[]
  areaLabel: string
  colapsada: boolean
  aoAlternar: () => void
  /** "Meu Dízimo Digital" só aparece na área do dizimista — ver BrandMark. */
  exibirNomeApp?: boolean
}

/** Só aparece no computador (lg+) — no celular a navegação é pela gaveta do menu-sanduíche (AppTopbar). */
export function AppSidebar({ navItems, areaLabel, colapsada, aoAlternar, exibirNomeApp = true }: AppSidebarProps) {
  const { pathname } = useLocation()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 hidden flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex',
        colapsada ? 'w-[76px]' : 'w-72',
      )}
    >
      <div className="flex min-h-16 items-center border-b border-border px-4 py-3">
        {colapsada ? (
          <button
            type="button"
            onClick={aoAlternar}
            aria-label="Expandir menu"
            title="Expandir menu"
            className="mx-auto rounded-lg transition-opacity hover:opacity-80"
          >
            <BrandMark iconOnly />
          </button>
        ) : (
          <div className="flex w-full items-center justify-between">
            <Link to={ROUTES.home}>
              <BrandMark mostrarNome={exibirNomeApp} />
            </Link>
          </div>
        )}
      </div>

      {!colapsada && (
        <p className="px-5 pt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{areaLabel}</p>
      )}

      <nav className={cn('flex-1 space-y-1 overflow-y-auto px-3 py-3', colapsada && 'px-2.5')}>
        {navItems.map((item) => {
          // Não usa a forma de função do `className` do NavLink aqui: dentro de um Tooltip com
          // `asChild`, o Radix mescla as props ANTES do NavLink resolver a função, e o resultado
          // vira o texto literal da função em vez das classes — daí o menu ficar "invisível".
          const isActive = item.end ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
          const itemNav = (
            <NavLink
              to={item.href}
              end={item.end}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                colapsada && 'justify-center px-0',
                isActive && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!colapsada && <span className="min-w-0 truncate">{item.label}</span>}
            </NavLink>
          )

          return colapsada ? (
            <Tooltip key={item.href} delayDuration={200}>
              <TooltipTrigger asChild>{itemNav}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            <div key={item.href}>{itemNav}</div>
          )
        })}
      </nav>

      <div className="mb-3 flex items-center px-2.5">
        {colapsada ? (
          <button
            type="button"
            onClick={aoAlternar}
            aria-label="Expandir menu"
            title="Expandir menu"
            className="flex h-8 flex-1 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={aoAlternar}
            aria-label="Recolher menu"
            title="Recolher menu"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
