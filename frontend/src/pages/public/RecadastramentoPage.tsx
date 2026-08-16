import { useNavigate } from 'react-router-dom'
import { HeartHandshake } from 'lucide-react'
import { toast } from 'sonner'

import { RecadastramentoForm } from '@/components/forms/RecadastramentoForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { salvarRecadastramento } from '@/services/dizimistaService'
import type { DadosCadastraisDizimista } from '@/types'
import { ROUTES } from '@/constants/routes'

export function RecadastramentoPage() {
  const navigate = useNavigate()

  async function handleSalvar(
    dados: DadosCadastraisDizimista,
    numeroCarneInformado: string,
    opcoes?: { numeroCarneAnterior?: string },
  ) {
    await salvarRecadastramento(numeroCarneInformado, dados, opcoes?.numeroCarneAnterior)
    toast.success(
      opcoes?.numeroCarneAnterior
        ? `Recadastramento concluído! Seu carnê agora é o nº ${numeroCarneInformado}.`
        : 'Recadastramento concluído! Agora você já pode entrar com seu carnê e o dia/mês do seu nascimento.',
    )
    navigate(ROUTES.entrar)
  }

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6">
      <div className="hidden flex-col items-center text-center sm:flex">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HeartHandshake className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">Recadastramento</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Atualize seus dados usando o número do carnê que você já possui.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader className="sm:hidden">
          <CardTitle className="text-xl">Recadastramento</CardTitle>
          <CardDescription>Atualize seus dados usando o número do carnê que você já possui.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecadastramentoForm onSalvar={handleSalvar} />
        </CardContent>
      </Card>
    </div>
  )
}
