import { Link } from 'react-router-dom'
import { ArrowRight, Church } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'

export function HomePage() {
  return (
    <section className="bg-secondary/40">
      <div className="container flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Church className="h-8 w-8" />
        </span>

        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          Capela Nossa Senhora de Lourdes
        </h1>

        <p className="max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
          Bem-vindo(a) ao espaço digital da nossa comunidade.
        </p>

        <Button asChild size="lg">
          <Link to={ROUTES.recadastramento}>
            Recadastramento
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
