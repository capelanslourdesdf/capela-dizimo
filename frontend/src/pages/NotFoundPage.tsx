import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/layout/BrandMark'
import { ROUTES } from '@/constants/routes'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-secondary/30 px-4 text-center">
      <BrandMark />
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Compass className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Página não encontrada</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          O endereço acessado não existe ou foi movido. Vamos te levar de volta para um caminho conhecido.
        </p>
      </div>
      <Button asChild size="lg">
        <Link to={ROUTES.home}>Voltar ao início</Link>
      </Button>
    </div>
  )
}
