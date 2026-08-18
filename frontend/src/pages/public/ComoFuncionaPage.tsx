import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, IdCard, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ROUTES } from '@/constants/routes'

const etapas = [
  {
    icone: IdCard,
    titulo: '1. Informe seu carnê',
    descricao: 'Digite o número do carnê que você já possui. Não sabe o número? Buscamos pelo seu nome e data de nascimento.',
  },
  {
    icone: UserPlus,
    titulo: '2. Atualize seus dados',
    descricao: 'Confirme ou corrija seu nome completo, data de nascimento e telefone/WhatsApp.',
  },
  {
    icone: CheckCircle2,
    titulo: '3. Pronto!',
    descricao: 'Seus dados ficam atualizados junto à Pastoral do Dízimo da Capela.',
  },
]

const perguntas = [
  {
    pergunta: 'O que dá para fazer no site hoje?',
    resposta: 'Por enquanto, o site serve só para o recadastramento dos dizimistas junto à Pastoral do Dízimo.',
  },
  {
    pergunta: 'Como faço para contribuir com o dízimo?',
    resposta:
      'A contribuição continua pelos canais de sempre da Pastoral do Dízimo. O site, por enquanto, não processa pagamentos nem faz consultas — ele é só para recadastramento.',
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
]

export function ComoFuncionaPage() {
  return (
    <div>
      <section className="bg-secondary/40">
        <div className="container flex flex-col items-center gap-4 py-14 text-center sm:py-20">
          <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Como funciona o recadastramento
          </h1>
          <p className="max-w-lg text-muted-foreground sm:text-lg">
            Atualize seus dados junto à Pastoral do Dízimo com poucos toques, direto do celular.
          </p>
        </div>
      </section>

      <section className="container py-14 sm:py-20">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {etapas.map((etapa) => (
            <Card key={etapa.titulo}>
              <CardContent className="flex gap-4">
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
          Junte-se às famílias que já se recadastraram junto à Pastoral do Dízimo.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link to={ROUTES.recadastramento}>
            Fazer meu recadastramento
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  )
}
