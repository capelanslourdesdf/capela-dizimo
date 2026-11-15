import * as React from 'react'
import { Cake } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { diaMesDoRegistro, listarAniversariantesDoMes } from '@/services/dizimistaService'
import type { Dizimista } from '@/types'
import { formatarNumeroCarne } from '@/utils/format'
import { cn } from '@/lib/utils'

/** Quantos dias pra trás/pra frente contam como "a semana que acabou"/"a semana que vai iniciar". */
const JANELA_DIAS = 7

interface AniversarianteOrdenado {
  dizimista: Dizimista
  dia: number
  /** Dias de diferença pro dia de hoje dentro do mesmo mês — negativo é passado, positivo é futuro. */
  delta: number
}

interface BadgeDestaque {
  label: string
  variant: 'default' | 'success' | 'muted'
}

/** `null` quando o aniversário está fora da janela de destaque (mais de 7 dias de distância). */
function badgeDoDelta(delta: number): BadgeDestaque | null {
  if (delta === 0) return { label: 'Hoje', variant: 'default' }
  if (delta > 0 && delta <= JANELA_DIAS) return { label: `Daqui ${delta} dia${delta > 1 ? 's' : ''}`, variant: 'success' }
  if (delta < 0 && delta >= -JANELA_DIAS) {
    const dias = Math.abs(delta)
    return { label: `${dias} dia${dias > 1 ? 's' : ''} atrás`, variant: 'muted' }
  }
  return null
}

export function AniversariantesPage() {
  const [carregando, setCarregando] = React.useState(true)
  const [aniversariantesDoMes, setAniversariantesDoMes] = React.useState<Dizimista[]>([])

  const hoje = React.useMemo(() => new Date(), [])
  const mesAtual = hoje.getMonth() + 1
  const diaHoje = hoje.getDate()

  const nomeMesAtual = React.useMemo(() => {
    const nome = hoje.toLocaleDateString('pt-BR', { month: 'long' })
    return nome.charAt(0).toUpperCase() + nome.slice(1)
  }, [hoje])

  React.useEffect(() => {
    listarAniversariantesDoMes(mesAtual)
      .then(setAniversariantesDoMes)
      .finally(() => setCarregando(false))
  }, [mesAtual])

  const ordenados: AniversarianteOrdenado[] = React.useMemo(
    () =>
      aniversariantesDoMes
        .map((d) => ({ dizimista: d, diaMes: diaMesDoRegistro(d) }))
        .filter(({ diaMes }) => /^\d{2}\/\d{2}$/.test(diaMes))
        .map(({ dizimista, diaMes }) => {
          const dia = Number(diaMes.slice(0, 2))
          return { dizimista, dia, delta: dia - diaHoje }
        })
        .sort((a, b) => a.dia - b.dia),
    [aniversariantesDoMes, diaHoje],
  )

  // Da semana que acabou (até 7 dias atrás) até a semana que vai iniciar (até 7 dias à frente),
  // incluindo hoje — mesma lista, já ordenada cronologicamente por vir de `ordenados`.
  const destaques = React.useMemo(() => ordenados.filter((item) => badgeDoDelta(item.delta) !== null), [ordenados])

  if (carregando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Aniversariantes de ${nomeMesAtual}`}
        description={
          ordenados.length === 0
            ? 'Nenhum dizimista faz aniversário este mês.'
            : `${ordenados.length} dizimista(s) fazem aniversário este mês.`
        }
      />

      {ordenados.length === 0 ? (
        <EmptyState icon={Cake} title="Nenhum aniversariante este mês" />
      ) : (
        <div className="space-y-6">
          {destaques.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Aniversariantes da semana</h2>
              <p className="-mt-2 mb-3 text-xs text-muted-foreground">Da semana que passou até a semana que vem.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {destaques.map(({ dizimista: d, dia, delta }) => {
                  const badge = badgeDoDelta(delta)
                  if (!badge) return null
                  return (
                    <Card
                      key={d.numeroCarne}
                      className={cn(
                        'border-l-4',
                        delta === 0 && 'border-l-primary',
                        delta > 0 && 'border-l-success',
                        delta < 0 && 'border-l-muted-foreground/30',
                      )}
                    >
                      <CardContent className="space-y-3 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                            {String(dia).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{d.nomeCompleto}</p>
                            <p className="truncate text-xs text-muted-foreground">Carnê nº {formatarNumeroCarne(d.numeroCarne)}</p>
                          </div>
                        </div>
                        <StatusBadge label={badge.label} variant={badge.variant} />
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Todos de {nomeMesAtual}</h2>
            <Card>
              <CardContent className="py-2">
                <ul className="divide-y divide-border">
                  {ordenados.map(({ dizimista: d, dia, delta }) => {
                    const badge = badgeDoDelta(delta)
                    return (
                      <li key={d.numeroCarne} className="flex items-center gap-3 py-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                          {String(dia).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{d.nomeCompleto}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            Carnê nº {formatarNumeroCarne(d.numeroCarne)} · {d.telefone || '—'}
                          </p>
                        </div>
                        {badge && <StatusBadge label={badge.label} variant={badge.variant} />}
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
