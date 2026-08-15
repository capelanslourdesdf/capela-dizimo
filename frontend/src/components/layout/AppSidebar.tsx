import { Link, NavLink } from 'react-router-dom'

import { BrandMark } from '@/components/layout/BrandMark'
import type { NavItem } from '@/constants/nav'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

interface AppSidebarProps {
  navItems: NavItem[]
  areaLabel: string
}

export function AppSidebar({ navItems, areaLabel }: AppSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link to={ROUTES.home}>
          <BrandMark />
        </Link>
      </div>

      <p className="px-5 pt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{areaLabel}</p>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
