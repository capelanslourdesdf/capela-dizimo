import { Link } from 'react-router-dom'
import { ArrowRight, HandCoins, HeartHandshake, ShieldCheck, Smartphone, Sparkles, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ROUTES } from '@/constants/routes'

const beneficios = [
  {
    icone: Smartphone,
    titulo: 'Praticidade',
    descricao: 'Contribua em poucos toques, de onde estiver, sem precisar ir até a Capela.',
  },
  {
    icone: ShieldCheck,
    titulo: 'Transparência',
    descricao: 'Acompanhe cada contribuição, comprovante e o uso responsável dos recursos.',
  },
  {
    icone: HeartHandshake,
    titulo: 'Acolhimento',
    descricao: 'Uma plataforma pensada para aproximar a Pastoral do Dízimo da nossa comunidade.',
  },
  {
    icone: Users,
    titulo: 'Família',
    descricao: 'Organize a contribuição de toda a família em um só lugar, com clareza.',
  },
]

const passos = [
  { numero: '01', titulo: 'Recadastre-se', descricao: 'Informe o número do seu carnê e atualize seus dados.' },
  { numero: '02', titulo: 'Contribua via Pix', descricao: 'Gere um Pix e contribua em poucos toques.' },
  { numero: '03', titulo: 'Acompanhe', descricao: 'Consulte seu carnê e seus pagamentos a qualquer hora.' },
]

export function LandingPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-secondary/50">
        <div className="container relative flex flex-col items-center gap-8 py-14 text-center sm:py-20 lg:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-background px-3.5 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Pastoral do Dízimo — Capela Nossa Senhora de Lourdes
          </span>

          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Sua contribuição, com fé, organização e transparência
          </h1>

          <p className="max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            O Meu Dízimo Digital é a forma simples e acolhedora de contribuir com o dízimo, acompanhar sua família e
            fortalecer nossa comunidade.
          </p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to={ROUTES.recadastramento}>
                Fazer recadastramento
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link to={ROUTES.comoFunciona}>Como funciona</Link>
            </Button>
          </div>

          <dl className="mt-4 grid w-full max-w-lg grid-cols-3 gap-4 rounded-xl border border-border bg-background/80 p-5 text-center shadow-sm sm:p-6">
            <div>
              <dt className="text-xl font-semibold text-primary sm:text-2xl">52</dt>
              <dd className="text-xs text-muted-foreground sm:text-sm">famílias dizimistas</dd>
            </div>
            <div>
              <dt className="text-xl font-semibold text-primary sm:text-2xl">6</dt>
              <dd className="text-xs text-muted-foreground sm:text-sm">anos de história</dd>
            </div>
            <div>
              <dt className="text-xl font-semibold text-primary sm:text-2xl">100%</dt>
              <dd className="text-xs text-muted-foreground sm:text-sm">transparente</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="container py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Por que contribuir pelo Meu Dízimo Digital</h2>
          <p className="mt-3 text-muted-foreground">
            Feito para unir praticidade e cuidado pastoral, respeitando o tempo e a confiança de cada família.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {beneficios.map((item) => (
            <Card key={item.titulo} className="border-border/80">
              <CardContent className="pt-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icone className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{item.titulo}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.descricao}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40">
        <div className="container py-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Simples como deve ser</h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {passos.map((passo) => (
              <div key={passo.numero} className="text-center sm:text-left">
                <span className="text-3xl font-semibold text-primary/30">{passo.numero}</span>
                <h3 className="mt-2 font-semibold text-foreground">{passo.titulo}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{passo.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-14 sm:py-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-primary/15 bg-primary/5 p-8 text-center sm:p-10">
          <HandCoins className="mx-auto h-8 w-8 text-primary" />
          <blockquote className="mt-4 text-lg font-medium italic text-foreground sm:text-xl">
            &ldquo;Cada um contribua segundo propôs no seu coração, não com tristeza ou por obrigação, porque Deus ama
            quem dá com alegria.&rdquo;
          </blockquote>
          <p className="mt-3 text-sm text-muted-foreground">2 Coríntios 9:7</p>
        </div>
      </section>

      <section className="container pb-16 sm:pb-24">
        <div className="flex flex-col items-center gap-5 rounded-2xl bg-primary px-6 py-10 text-center text-primary-foreground sm:px-10">
          <h2 className="text-2xl font-semibold sm:text-3xl">Faça parte dessa comunidade de gratidão</h2>
          <p className="max-w-md text-sm text-primary-foreground/90 sm:text-base">
            Recadastre-se agora e comece a contribuir com poucos toques, com toda a organização que sua família
            merece.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to={ROUTES.recadastramento}>
              Fazer recadastramento
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
