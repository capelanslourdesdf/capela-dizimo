import { Link } from 'react-router-dom'
import { ArrowRight, HandCoins, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'

export function DizimoPage() {
  return (
    <section className="bg-secondary/40">
      <div className="container flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <HandCoins className="h-8 w-8" />
        </span>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Meu Dízimo Digital</h1>
          <p className="mt-3 text-base text-muted-foreground">Capela Nossa Senhora de Lourdes</p>
        </div>

        <p className="max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
          Acompanhe suas devoluções e mantenha seus dados em dia com a Pastoral do Dízimo.
        </p>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to={ROUTES.entrar}>
              Acompanhar meu dízimo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link to={ROUTES.pastoral.entrar}>
              <Users className="h-4 w-4" />
              Área da Pastoral
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
