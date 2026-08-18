import * as React from 'react'
import { useFieldArray, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Layers, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { buscarDizimistaPorCarne } from '@/services/dizimistaService'
import { lancarDevolucao } from '@/services/devolucaoService'
import { listarMembrosPastoral } from '@/services/membroPastoralService'
import type { FormaPagamentoDevolucao, MembroPastoral } from '@/types'
import { competenciaAtual, competenciaParaMesAno, maskMesAno, maskMoeda, mesAnoEhValido, mesAnoParaCompetencia, moedaParaNumero } from '@/utils/format'
import { FORMAS_PAGAMENTO_DEVOLUCAO } from '@/constants/devolucao'

const linhaSchema = z.object({
  numeroCarne: z.string(),
  valor: z.string(),
})

const schema = z.object({
  competencia: z
    .string()
    .regex(/^\d{2}\/\d{4}$/, 'Use o formato mm/aaaa.')
    .refine((valor) => mesAnoEhValido(valor), 'Informe um mês/ano válido.'),
  formaPagamento: z.enum(['pix', 'cartao', 'dinheiro']),
  lancadoPor: z.string().min(1, 'Informe quem está lançando.'),
  linhas: z.array(linhaSchema).min(1),
})

type FormValues = z.infer<typeof schema>

const linhaVazia = { numeroCarne: '', valor: '' }

function valoresIniciais(): FormValues {
  return {
    competencia: competenciaParaMesAno(competenciaAtual()),
    formaPagamento: 'pix',
    lancadoPor: '',
    linhas: [{ ...linhaVazia }],
  }
}

interface ResultadoLinha {
  index: number
  numeroCarne: string
  ok: boolean
  mensagem: string
}

export function LancamentoLotePage() {
  const [erro, setErro] = React.useState<string | null>(null)
  const [processando, setProcessando] = React.useState(false)
  const [membros, setMembros] = React.useState<MembroPastoral[]>([])
  const [carregandoMembros, setCarregandoMembros] = React.useState(true)

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: valoresIniciais(),
  })

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'linhas' })

  React.useEffect(() => {
    listarMembrosPastoral()
      .then(setMembros)
      .finally(() => setCarregandoMembros(false))
  }, [])

  async function onSubmit(values: FormValues) {
    setErro(null)

    // Linhas totalmente em branco são ignoradas (sobram ao adicionar campos demais); linhas com
    // só um dos dois campos preenchidos são um erro, já que ficaria ambíguo o que processar.
    const linhasPreenchidas = values.linhas
      .map((linha, index) => ({ ...linha, index }))
      .filter((linha) => linha.numeroCarne.trim() || linha.valor.trim())

    if (linhasPreenchidas.length === 0) {
      setErro('Informe ao menos um número de carnê e valor.')
      return
    }

    const linhasIncompletas = linhasPreenchidas.filter((l) => !l.numeroCarne.trim() || !moedaParaNumero(l.valor))
    if (linhasIncompletas.length > 0) {
      setErro('Há linha(s) com número de carnê ou valor faltando. Preencha os dois campos ou remova a linha.')
      return
    }

    setProcessando(true)
    const competencia = mesAnoParaCompetencia(values.competencia)
    const resultados: ResultadoLinha[] = []

    for (const linha of linhasPreenchidas) {
      const numeroCarne = linha.numeroCarne.trim()
      const valor = moedaParaNumero(linha.valor)

      try {
        const dizimista = await buscarDizimistaPorCarne(numeroCarne)
        if (!dizimista) {
          resultados.push({ index: linha.index, numeroCarne, ok: false, mensagem: 'Carnê não encontrado.' })
          continue
        }

        await lancarDevolucao(numeroCarne, {
          valor,
          formaPagamento: values.formaPagamento as FormaPagamentoDevolucao,
          competencia,
          lancadoPor: values.lancadoPor,
        })

        resultados.push({
          index: linha.index,
          numeroCarne,
          ok: true,
          mensagem: `${dizimista.nomeCompleto} — lançado.`,
        })
      } catch {
        resultados.push({ index: linha.index, numeroCarne, ok: false, mensagem: 'Falha ao lançar. Tente novamente.' })
      }
    }

    setProcessando(false)

    const sucesso = resultados.filter((r) => r.ok)
    const falha = resultados.filter((r) => !r.ok)

    if (falha.length === 0) {
      toast.success(`${sucesso.length} devolução(ões) lançada(s) com sucesso.`)
      reset(valoresIniciais())
      return
    }

    // Mantém só as linhas que falharam, para corrigir o carnê e reprocessar sem redigitar tudo.
    const linhasRestantes = falha.map((r) => values.linhas[r.index])
    replace(linhasRestantes.length > 0 ? linhasRestantes : [{ ...linhaVazia }])

    if (sucesso.length > 0) {
      toast.success(`${sucesso.length} devolução(ões) lançada(s). ${falha.length} com erro — confira abaixo.`)
    } else {
      toast.error('Nenhuma devolução foi lançada. Confira os erros abaixo.')
    }

    setErro(
      falha.map((r) => `Carnê nº ${r.numeroCarne || '(vazio)'}: ${r.mensagem}`).join(' '),
    )
  }

  return (
    <div>
      <PageHeader
        title="Lançamento de devoluções em lote"
        description="Lance a devolução de vários dizimistas de uma vez para um mesmo mês/ano."
      />

      <Card className="max-w-3xl">
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            {erro && (
              <Alert variant="destructive">
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="competencia">Mês/ano da devolução</Label>
                <Controller
                  control={control}
                  name="competencia"
                  render={({ field }) => (
                    <Input
                      id="competencia"
                      inputMode="numeric"
                      placeholder="mm/aaaa"
                      value={field.value}
                      onChange={(e) => field.onChange(maskMesAno(e.target.value))}
                    />
                  )}
                />
                {errors.competencia && <p className="text-xs text-destructive">{errors.competencia.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formaPagamento">Forma de pagamento</Label>
                <Controller
                  control={control}
                  name="formaPagamento"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="formaPagamento">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAS_PAGAMENTO_DEVOLUCAO.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lancadoPor">Lançado por</Label>
                <Controller
                  control={control}
                  name="lancadoPor"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={carregandoMembros}>
                      <SelectTrigger id="lancadoPor">
                        <SelectValue placeholder={carregandoMembros ? 'Carregando...' : 'Selecione'} />
                      </SelectTrigger>
                      <SelectContent>
                        {membros.map((m) => (
                          <SelectItem key={m.id} value={m.nome}>
                            {m.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.lancadoPor && <p className="text-xs text-destructive">{errors.lancadoPor.message}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Dizimistas</h2>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ ...linhaVazia })}>
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar linha
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                  <div className="space-y-1.5">
                    {index === 0 && <Label htmlFor={`linhas.${index}.numeroCarne`}>Nº do carnê</Label>}
                    <Controller
                      control={control}
                      name={`linhas.${index}.numeroCarne`}
                      render={({ field: f }) => (
                        <Input id={`linhas.${index}.numeroCarne`} inputMode="numeric" placeholder="Nº do carnê" {...f} />
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    {index === 0 && <Label htmlFor={`linhas.${index}.valor`}>Valor</Label>}
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                      <Controller
                        control={control}
                        name={`linhas.${index}.valor`}
                        render={({ field: f }) => (
                          <Input
                            id={`linhas.${index}.valor`}
                            inputMode="numeric"
                            placeholder="0,00"
                            className="pl-9"
                            value={f.value}
                            onChange={(e) => f.onChange(maskMoeda(e.target.value))}
                          />
                        )}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                    aria-label="Remover linha"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={processando}>
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              {processando
                ? `Processando ${getValues('linhas').length} linha(s)...`
                : 'Processar lote'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
