import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { DevolucaoForm } from '@/components/forms/DevolucaoForm'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { buscarDizimistaPorCarne } from '@/services/dizimistaService'
import { lancarDevolucao, type DadosDevolucao } from '@/services/devolucaoService'
import { CARNE_AVULSO } from '@/constants/devolucao'
import { competenciaAtual } from '@/utils/format'
import { ROUTES } from '@/constants/routes'

export function LancamentoUnicoPage() {
  const navigate = useNavigate()
  const [numeroCarne, setNumeroCarne] = React.useState('')
  // Muda a cada lançamento com sucesso, forçando o DevolucaoForm a remontar com os campos em
  // branco — assim dá pra lançar várias devoluções seguidas sem sair da tela.
  const [formularioKey, setFormularioKey] = React.useState(0)

  async function handleSalvar(dados: DadosDevolucao) {
    const digitado = numeroCarne.trim()
    if (!digitado) {
      throw new Error('Informe o número do carnê (ou -x- para avulsa).')
    }

    // Aceita o carnê digitado com ou sem zeros à esquerda — a devolução é lançada sob o id
    // real devolvido pela busca, não o que foi digitado.
    let carneReal = digitado
    if (digitado !== CARNE_AVULSO) {
      const dizimista = await buscarDizimistaPorCarne(digitado)
      if (!dizimista) {
        throw new Error('Carnê não encontrado.')
      }
      carneReal = dizimista.numeroCarne
    }

    await lancarDevolucao(carneReal, dados)
    toast.success('Devolução lançada com sucesso.')
    setNumeroCarne('')
    setFormularioKey((k) => k + 1)
  }

  return (
    <div>
      <PageHeader title="Lançar devolução" description="Lance a devolução de um único dizimista." />

      <Card className="max-w-2xl">
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="numeroCarne">Nº do carnê</Label>
            <Input
              id="numeroCarne"
              inputMode="numeric"
              placeholder="Número do carnê"
              value={numeroCarne}
              onChange={(e) => setNumeroCarne(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use <span className="font-mono font-medium text-foreground">{CARNE_AVULSO}</span> pra lançar uma
              devolução avulsa (sem dizimista cadastrado).
            </p>
          </div>
          <DevolucaoForm
            key={formularioKey}
            competenciaPadrao={competenciaAtual()}
            onSalvar={handleSalvar}
            onCancelar={() => navigate(ROUTES.pastoral.root)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
