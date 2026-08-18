import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'

import { BrandMark } from '@/components/layout/BrandMark'
import { ROUTES } from '@/constants/routes'

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="container flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <BrandMark />
          <p className="mt-3 text-sm text-muted-foreground">
            Uma iniciativa da Pastoral do Dízimo para fortalecer a comunidade da Capela Nossa Senhora de Lourdes,
            com transparência e gratidão.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm sm:flex sm:gap-16">
          <div>
            <p className="font-medium text-foreground">Navegação</p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <Link to={ROUTES.home} className="hover:text-foreground">
                  Início
                </Link>
              </li>
              <li>
                <Link to={ROUTES.dizimo} className="hover:text-foreground">
                  Dízimo
                </Link>
              </li>
              <li>
                <Link to={ROUTES.comoFunciona} className="hover:text-foreground">
                  Como funciona
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Acesso</p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <Link to={ROUTES.pastoral.entrar} className="hover:text-foreground">
                  Área da Pastoral
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Capela Nossa Senhora de Lourdes — Pastoral do Dízimo.</p>
          <p className="flex items-center gap-1.5">
            Feito com <Heart className="h-3.5 w-3.5 fill-primary text-primary" /> para a nossa comunidade.
          </p>
        </div>
      </div>
    </footer>
  )
}
