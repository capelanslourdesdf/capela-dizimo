import { Link } from 'react-router-dom'
import { ArrowRight, CreditCard, FileCheck2, QrCode, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ROUTES } from '@/constants/routes'

const etapas = [
  {
    icone: UserPlus,
    titulo: '1. Recadastre-se',
    descricao:
      'Informe o número do carnê que você já possui e atualize seus dados — nome, nascimento, endereço, telefone e família.',
  },
  {
    icone: QrCode,
    titulo: '2. Contribua via Pix',
    descricao: 'Entre com seu carnê e data de nascimento e gere um Pix para contribuir a qualquer momento.',
  },
  {
    icone: FileCheck2,
    titulo: '3. Acompanhe tudo em um só lugar',
    descricao: 'Consulte o número do seu carnê e o histórico de pagamentos do mês a qualquer momento.',
  },
  {
    icone: CreditCard,
    titulo: '4. Receba a confirmação',
    descricao: 'Assim que o Pix é identificado, o pagamento aparece confirmado no seu histórico.',
  },
]

const perguntas = [
  {
    pergunta: 'Preciso pagar alguma taxa para usar a plataforma?',
    resposta:
      'Não. O uso do Meu Dízimo Digital é gratuito para os dizimistas. Eventuais taxas de processamento de pagamento seguem as praticadas pelos meios de pagamento utilizados.',
  },
  {
    pergunta: 'Não sei o número do meu carnê, o que eu faço?',
    resposta: 'Procure a Pastoral do Dízimo da Capela para confirmar o número do seu carnê ou solicitar um novo cadastro.',
  },
  {
    pergunta: 'Meus dados estão seguros?',
    resposta:
      'Seus dados são utilizados exclusivamente pela Pastoral do Dízimo para a gestão das contribuições e não são compartilhados com terceiros.',
  },
  {
    pergunta: 'Ainda posso contribuir em dinheiro na Capela?',
    resposta:
      'Com certeza. A plataforma é um canal a mais de contribuição — a forma presencial continua disponível para quem preferir.',
  },
]

export function ComoFuncionaPage() {
  return (
    <div>
      <section className="bg-secondary/40">
        <div className="container flex flex-col items-center gap-4 py-14 text-center sm:py-20">
          <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Como funciona o Meu Dízimo Digital
          </h1>
          <p className="max-w-lg text-muted-foreground sm:text-lg">
            Um caminho simples entre você e a Pastoral do Dízimo, do cadastro à confirmação da sua contribuição.
          </p>
        </div>
      </section>

      <section className="container py-14 sm:py-20">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {etapas.map((etapa) => (
            <Card key={etapa.titulo}>
              <CardContent className="flex gap-4 pt-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <etapa.icone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{etapa.titulo}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{etapa.descricao}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40">
        <div className="container py-14 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">Perguntas frequentes</h2>
            <Accordion type="single" collapsible className="mt-8">
              {perguntas.map((item) => (
                <AccordionItem key={item.pergunta} value={item.pergunta}>
                  <AccordionTrigger className="text-left">{item.pergunta}</AccordionTrigger>
                  <AccordionContent>{item.resposta}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="container py-14 text-center sm:py-20">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Pronto para começar?</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Junte-se às famílias que já contribuem com organização e transparência.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link to={ROUTES.entrar}>
            Acompanhar meu dízimo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  )
}
