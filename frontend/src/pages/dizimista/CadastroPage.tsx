import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { RecadastramentoForm } from '@/components/forms/RecadastramentoForm'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDizimistaSessao } from '@/hooks/useDizimistaSessao'
import { salvarRecadastramento } from '@/services/dizimistaService'
import type { DadosCadastraisDizimista } from '@/types'

export function DizimistaCadastroPage() {
  const { numeroCarne, dizimista, carregando, recarregar } = useDizimistaSessao()

  async function handleSalvar(dados: DadosCadastraisDizimista) {
    if (!numeroCarne) return
    await salvarRecadastramento(numeroCarne, dados)
    await recarregar()
    toast.success('Dados atualizados com sucesso.')
  }

  return (
    <div>
      <PageHeader title="Atualização cadastral" description="Mantenha seus dados sempre atualizados." />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          {carregando || !dizimista ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <RecadastramentoForm dizimista={dizimista} bloquearCarne onSalvar={handleSalvar} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
