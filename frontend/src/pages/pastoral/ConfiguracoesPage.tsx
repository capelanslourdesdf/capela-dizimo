import * as React from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { MembrosPastoralSection } from '@/components/pastoral/MembrosPastoralSection'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

import { obterMinimoMesesAtivos, salvarMinimoMesesAtivos } from '@/services/configuracaoService'
import { JANELA_MESES_STATUS } from '@/utils/statusDizimista'

export function ConfiguracoesPage() {
  const [minimoMeses, setMinimoMeses] = React.useState<number | null>(null)
  const [minimoInput, setMinimoInput] = React.useState('')
  const [carregando, setCarregando] = React.useState(true)
  const [salvando, setSalvando] = React.useState(false)

  React.useEffect(() => {
    obterMinimoMesesAtivos().then((valor) => {
      setMinimoMeses(valor)
      setMinimoInput(String(valor))
      setCarregando(false)
    })
  }, [])

  async function handleSalvar() {
    const valor = Number(minimoInput)
    if (!Number.isInteger(valor) || valor <= 0 || valor > JANELA_MESES_STATUS) {
      toast.error(`Informe um número inteiro entre 1 e ${JANELA_MESES_STATUS}.`)
      return
    }

    setSalvando(true)
    try {
      await salvarMinimoMesesAtivos(valor)
      setMinimoMeses(valor)
      toast.success('Configuração salva.')
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const alterado = minimoMeses !== null && Number(minimoInput) !== minimoMeses

  return (
    <div>
      <PageHeader title="Configurações" description="Ajustes gerais da área da Pastoral do Dízimo." />

      <Card className="mb-6 max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Status ativo/inativo</CardTitle>
          <CardDescription>Define quando um dizimista aparece como Ativo ou Inativo na lista.</CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="minimoMeses">
                  Mínimo de meses com devolução, dos últimos {JANELA_MESES_STATUS} meses
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="minimoMeses"
                    type="number"
                    min={1}
                    max={JANELA_MESES_STATUS}
                    inputMode="numeric"
                    className="w-24"
                    value={minimoInput}
                    onChange={(e) => setMinimoInput(e.target.value)}
                  />
                  <Button onClick={handleSalvar} disabled={salvando || !alterado}>
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Um dizimista fica <strong className="text-foreground">Ativo</strong> quando devolveu em pelo menos
                esse número de meses dentro dos últimos {JANELA_MESES_STATUS} meses — caso contrário, fica{' '}
                <strong className="text-foreground">Inativo</strong>. Meses antes do recadastramento no site nunca
                contam contra o dizimista.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="mb-6" />

      <MembrosPastoralSection />
    </div>
  )
}
