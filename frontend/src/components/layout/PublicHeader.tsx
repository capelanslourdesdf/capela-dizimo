import * as React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'

import { BrandMark } from '@/components/layout/BrandMark'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Início', href: ROUTES.home },
  { label: 'Como funciona', href: ROUTES.comoFunciona },
  { label: 'Recadastramento', href: ROUTES.recadastramento },
]

export function PublicHeader() {
  const [open, setOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="container relative flex h-16 items-center justify-between">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
              <Menu className="h-7 w-7" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-4/5 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                <BrandMark subtitle={false} />
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {links.map((link) => (
                <SheetClose asChild key={link.href}>
                  <NavLink
                    to={link.href}
                    end
                    className="rounded-md px-3 py-2.5 text-base font-medium text-foreground hover:bg-accent"
                  >
                    {link.label}
                  </NavLink>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-2">
              <SheetClose asChild>
                <Button asChild size="lg">
                  <Link to={ROUTES.pastoral.entrar}>Administrativo</Link>
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>

        <Link
          to={ROUTES.home}
          className="absolute left-1/2 min-w-0 -translate-x-1/2 md:static md:left-auto md:translate-x-0"
        >
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  isActive && 'text-foreground',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost">
            <Link to={ROUTES.pastoral.entrar}>Administrativo</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
