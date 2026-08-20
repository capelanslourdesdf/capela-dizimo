import * as React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import type { ReactNode } from 'react'

import { BrandMark } from '@/components/layout/BrandMark'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { NavItem } from '@/constants/nav'
import { ROUTES } from '@/constants/routes'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/lib/utils'

interface AppTopbarProps {
  navItems: NavItem[]
  areaLabel: string
  userMenu: ReactNode
}

export function AppTopbar({ navItems, areaLabel, userMenu }: AppTopbarProps) {
  const [open, setOpen] = React.useState(false)
  const tituloDaTela = usePageTitle()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-8">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-4/5 max-w-xs overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              <Link to={ROUTES.home} onClick={() => setOpen(false)}>
                <BrandMark subtitle={false} />
              </Link>
            </SheetTitle>
          </SheetHeader>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{areaLabel}</p>
          <nav className="mt-2 flex flex-col gap-1">
            {navItems.map((item) => (
              <SheetClose asChild key={item.href}>
                <NavLink
                  to={item.href}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent',
                      isActive && 'bg-primary text-primary-foreground hover:bg-primary',
                    )
                  }
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="min-w-0 truncate">{item.label}</span>
                </NavLink>
              </SheetClose>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0">
        <p className="truncate text-base font-semibold text-foreground sm:text-lg lg:hidden">
          {tituloDaTela || 'Meu Dízimo Digital'}
        </p>
        <p className="hidden truncate text-sm font-medium text-muted-foreground lg:block">{areaLabel}</p>
      </div>

      {userMenu}
    </header>
  )
}
