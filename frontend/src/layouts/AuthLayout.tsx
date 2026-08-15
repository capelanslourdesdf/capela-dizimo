import { Link, Outlet } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { BrandMark } from '@/components/layout/BrandMark'
import { ROUTES } from '@/constants/routes'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <header className="border-b border-border bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link to={ROUTES.home}>
            <BrandMark />
          </Link>
          <Link
            to={ROUTES.home}
            className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:flex"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <Outlet />
      </main>
    </div>
  )
}
