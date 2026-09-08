import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { RecadastramentoForm } from '@/components/forms/RecadastramentoForm'
import { Card, CardContent } from '@/components/ui/card'

import { criarDizimistaAdmin } from '@/services/dizimistaService'
import type { DadosCadastraisDizimista } from '@/types'
import { formatarNumeroCarne } from '@/utils/format'
import { ROUTES } from '@/constants/routes'

export function CadastrarDizimistaPage() {
  const navigate = useNavigate()

  async function handleCadastrar(dados: DadosCadastraisDizimista) {
    const numeroCarne = await criarDizimistaAdmin(dados)
    toast.success(`Dizimista cadastrado(a) com o carnê nº ${formatarNumeroCarne(numeroCarne)}.`)
    navigate(ROUTES.pastoral.dizimistaDetalhe(numeroCarne))
  }

  return (
    <div>
      <PageHeader title="Cadastrar dizimista" description="Cadastre um novo dizimista na Pastoral do Dízimo." />

      <Card className="max-w-2xl">
        <CardContent>
          <RecadastramentoForm exibirCarne={false} onSalvar={handleCadastrar} />
        </CardContent>
      </Card>
    </div>
  )
}
