import * as React from 'react'
import { Link } from 'react-router-dom'
import { IdCard, QrCode, Receipt, Wallet } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { useDizimistaSessao } from '@/hooks/useDizimistaSessao'
import { listarPagamentos } from '@/services/pagamentoService'
import type { PagamentoPix } from '@/types'
import { formatCurrency } from '@/utils/format'
import { ROUTES } from '@/constants/routes'

function competenciaAtual(): string {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

/** "2026-08" -> "08/2026" */
function competenciaMesAno(competencia: string): string {
  const [ano, mes] = competencia.split('-')
  return `${mes}/${ano}`
}

export function DizimistaDashboardPage() {
  const { numeroCarne, dizimista } = useDizimistaSessao()
  const [pagamentos, setPagamentos] = React.useState<PagamentoPix[]>([])
  const [carregando, setCarregando] = React.useState(true)

  React.useEffect(() => {
    if (!numeroCarne) return
    listarPagamentos(numeroCarne).then((dados) => {
      setPagamentos(dados)
      setCarregando(false)
    })
  }, [numeroCarne])

  const competencia = competenciaAtual()
  const totalMesAprovado = pagamentos
    .filter((p) => p.competencia === competencia && p.status === 'aprovado')
    .reduce((soma, p) => soma + p.valor, 0)

  return (
    <div>
      <PageHeader title={`Olá, ${dizimista?.nomeCompleto.split(' ')[0] || 'dizimista'}`} description="Bem-vindo(a) à sua área." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Nº do carnê" value={numeroCarne || '—'} icon={IdCard} />
        {carregando ? (
          <Card>
            <CardContent>
              <Skeleton className="h-6 w-32" />
            </CardContent>
          </Card>
        ) : (
          <StatCard
            label={`Devolvido em ${competenciaMesAno(competencia)}`}
            value={formatCurrency(totalMesAprovado)}
            icon={Wallet}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IdCard className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">Atualização cadastral</p>
              <p className="mt-1 text-sm text-muted-foreground">Mantenha seus dados sempre em dia.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.dizimista.cadastro}>Atualizar dados</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">Pagar com Pix</p>
              <p className="mt-1 text-sm text-muted-foreground">Gere um Pix e contribua agora.</p>
            </div>
            <Button asChild size="sm">
              <Link to={ROUTES.dizimista.pagamento}>Gerar Pix</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">Meus pagamentos</p>
              <p className="mt-1 text-sm text-muted-foreground">Consulte seu histórico e devoluções.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.dizimista.pagamentos}>Ver histórico</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
