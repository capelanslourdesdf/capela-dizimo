import { NavLink } from 'react-router-dom'

import type { NavItem } from '@/constants/nav'
import { cn } from '@/lib/utils'

interface MobileBottomNavProps {
  navItems: NavItem[]
}

export function MobileBottomNav({ navItems }: MobileBottomNavProps) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur lg:hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-center gap-1.5 px-1 py-3 text-[11px] font-medium text-muted-foreground transition-colors',
                isActive && 'text-primary',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
