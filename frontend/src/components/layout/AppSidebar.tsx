import { Link, NavLink } from 'react-router-dom'
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
}

/**
 * Menu sempre visível, em todas as telas — no celular fica só nos ícones (não cabe o texto), no
 * computador a pessoa escolhe entre ícones só ou ícones + texto (botão de recolher/expandir).
 * Por isso boa parte das classes abaixo seguem o padrão "escondido por padrão, reaparece a partir
 * do lg: só quando `colapsada` é falso" — cobre os quatro casos (celular ligado/desligado o
 * recolhimento não muda nada; computador reage ao estado).
 */
export function AppSidebar({ navItems, areaLabel, colapsada, aoAlternar }: AppSidebarProps) {
  const expandidaNoDesktop = !colapsada

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-[76px] flex-col border-r border-border bg-card transition-[width] duration-200',
        expandidaNoDesktop && 'lg:w-64',
      )}
    >
      <div className="flex h-16 items-center justify-center border-b border-border px-3 lg:justify-between lg:px-4">
        <Link to={ROUTES.home} className={cn(expandidaNoDesktop && 'lg:hidden')}>
          <BrandMark iconOnly />
        </Link>

        {expandidaNoDesktop && (
          <>
            <Link to={ROUTES.home} className="hidden lg:block">
              <BrandMark />
            </Link>
            <button
              type="button"
              onClick={aoAlternar}
              aria-label="Recolher menu"
              title="Recolher menu"
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {expandidaNoDesktop && (
        <p className="hidden px-5 pt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:block">
          {areaLabel}
        </p>
      )}

      <nav className={cn('flex-1 space-y-1 overflow-y-auto px-2.5 py-3', expandidaNoDesktop && 'lg:px-3')}>
        {navItems.map((item) => (
          <Tooltip key={item.href} delayDuration={300}>
            <TooltipTrigger asChild>
              <NavLink
                to={item.href}
                end={item.end}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-center gap-3 rounded-lg px-0 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                    expandidaNoDesktop && 'lg:justify-start lg:px-3',
                    isActive && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                  )
                }
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className={cn('hidden min-w-0 truncate', expandidaNoDesktop && 'lg:inline')}>{item.label}</span>
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className={cn(expandidaNoDesktop && 'lg:hidden')}>
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>

      {!expandidaNoDesktop && (
        <button
          type="button"
          onClick={aoAlternar}
          aria-label="Expandir menu"
          title="Expandir menu"
          className="mx-2.5 mb-3 hidden h-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </aside>
  )
}
