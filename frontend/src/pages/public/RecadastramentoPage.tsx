import { HeartHandshake } from 'lucide-react'
import { toast } from 'sonner'

import { RecadastramentoForm } from '@/components/forms/RecadastramentoForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { salvarRecadastramento } from '@/services/dizimistaService'
import type { DadosCadastraisDizimista } from '@/types'

export function RecadastramentoPage() {
  async function handleSalvar(
    dados: DadosCadastraisDizimista,
    numeroCarneInformado: string,
    opcoes?: { carneGeradoPeloSite?: boolean },
  ) {
    await salvarRecadastramento(numeroCarneInformado, dados, { exigirNovo: opcoes?.carneGeradoPeloSite })

    // Permanece na própria página: o usuário volta ao topo e vê a confirmação.
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast.success(`Recadastramento concluído! Guarde o número do seu carnê: ${numeroCarneInformado}.`, {
      duration: 8000,
    })
  }

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6">
      <div className="hidden flex-col items-center text-center sm:flex">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HeartHandshake className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">Recadastramento</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Atualize seus dados usando o número do carnê.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader className="sm:hidden">
          <CardTitle className="text-xl">Recadastramento</CardTitle>
          <CardDescription>Atualize seus dados usando o número do carnê.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecadastramentoForm onSalvar={handleSalvar} limparAposSalvar />
        </CardContent>
      </Card>
    </div>
  )
}
