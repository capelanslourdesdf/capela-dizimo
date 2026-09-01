import * as React from 'react'
import { useFieldArray, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, Layers, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { buscarDizimistaPorCarne } from '@/services/dizimistaService'
import { lancarDevolucao } from '@/services/devolucaoService'
import { listarMembrosPastoral } from '@/services/membroPastoralService'
import type { FormaPagamentoDevolucao, MembroPastoral } from '@/types'
import {
  dataBrEhValida,
  dataBrParaIso,
  dataIsoParaBr,
  finalizarMoeda,
  formatCurrency,
  maskDataBr,
  maskMoeda,
  moedaParaNumero,
} from '@/utils/format'
import { CARNE_AVULSO, FORMAS_PAGAMENTO_DEVOLUCAO } from '@/constants/devolucao'

const linhaSchema = z.object({
  numeroCarne: z.string(),
  valor: z.string(),
})

const schema = z.object({
  data: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use o formato dd/mm/aaaa.')
    .refine((valor) => dataBrEhValida(valor), 'Informe uma data válida.'),
  formaPagamento: z.enum(['pix', 'cartao', 'dinheiro']),
  lancadoPor: z.string().min(1, 'Informe quem está lançando.'),
  linhas: z.array(linhaSchema).min(1),
})

type FormValues = z.infer<typeof schema>

const linhaVazia = { numeroCarne: '', valor: '' }

/** Limite defensivo para o "adicionar N linhas de uma vez", evitando travar a tela por engano. */
const MAX_LINHAS_POR_VEZ = 50

function valoresIniciais(): FormValues {
  return {
    // Mesma competência (mês de referência) pra todo o lote, derivada dessa data — a maioria dos
    // lotes é lançada no mesmo dia, por isso o padrão já vem preenchido com hoje.
    data: dataIsoParaBr(new Date().toISOString().slice(0, 10)),
    formaPagamento: 'pix',
    lancadoPor: '',
    linhas: [{ ...linhaVazia }],
  }
}

interface ResultadoLinha {
  index: number
  numeroCarne: string
  valor: number
  ok: boolean
  mensagem: string
}

export function LancamentoLotePage() {
  const [erro, setErro] = React.useState<string | null>(null)
  const [falhas, setFalhas] = React.useState<ResultadoLinha[]>([])
  const [processando, setProcessando] = React.useState(false)
  const [membros, setMembros] = React.useState<MembroPastoral[]>([])
  const [carregandoMembros, setCarregandoMembros] = React.useState(true)
  const [quantidadeParaAdicionar, setQuantidadeParaAdicionar] = React.useState('5')

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

  function handleAdicionarLinhas() {
    const quantidade = Math.min(Math.max(Math.trunc(Number(quantidadeParaAdicionar)) || 1, 1), MAX_LINHAS_POR_VEZ)
    append(Array.from({ length: quantidade }, () => ({ ...linhaVazia })))
  }

  React.useEffect(() => {
    listarMembrosPastoral()
      .then(setMembros)
      .finally(() => setCarregandoMembros(false))
  }, [])

  async function onSubmit(values: FormValues) {
    setErro(null)
    setFalhas([])

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
    const dataIso = dataBrParaIso(values.data)
    const competencia = dataIso.slice(0, 7)
    const resultados: ResultadoLinha[] = []

    for (const linha of linhasPreenchidas) {
      const digitado = linha.numeroCarne.trim()
      const valor = moedaParaNumero(linha.valor)

      try {
        if (digitado === CARNE_AVULSO) {
          await lancarDevolucao(CARNE_AVULSO, {
            valor,
            formaPagamento: values.formaPagamento as FormaPagamentoDevolucao,
            competencia,
            data: dataIso,
            lancadoPor: values.lancadoPor,
          })
          resultados.push({
            index: linha.index,
            numeroCarne: digitado,
            valor,
            ok: true,
            mensagem: 'Devolução avulsa — lançada.',
          })
          continue
        }

        // Aceita o carnê digitado com ou sem zeros à esquerda — a devolução é lançada sob o id
        // real devolvido pela busca, não o que foi digitado.
        const dizimista = await buscarDizimistaPorCarne(digitado)
        if (!dizimista) {
          resultados.push({ index: linha.index, numeroCarne: digitado, valor, ok: false, mensagem: 'Carnê não encontrado.' })
          continue
        }

        await lancarDevolucao(dizimista.numeroCarne, {
          valor,
          formaPagamento: values.formaPagamento as FormaPagamentoDevolucao,
          competencia,
          data: dataIso,
          lancadoPor: values.lancadoPor,
        })

        resultados.push({
          index: linha.index,
          numeroCarne: dizimista.numeroCarne,
          valor,
          ok: true,
          mensagem: `${dizimista.nomeCompleto} — lançado.`,
        })
      } catch {
        resultados.push({
          index: linha.index,
          numeroCarne: digitado,
          valor,
          ok: false,
          mensagem: 'Falha ao lançar. Tente novamente.',
        })
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
    setFalhas(falha)

    if (sucesso.length > 0) {
      toast.success(`${sucesso.length} devolução(ões) lançada(s). ${falha.length} não puderam ser lançadas — confira a lista abaixo.`)
    } else {
      toast.error(`Nenhuma devolução foi lançada. ${falha.length} registro(s) com erro — confira a lista abaixo.`)
    }
  }

  return (
    <div>
      <PageHeader
        title="Lançamento de devoluções em lote"
        description="Lance a devolução de vários dizimistas de uma vez, todas na mesma data."
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
                <Label htmlFor="data">Data da devolução</Label>
                <Controller
                  control={control}
                  name="data"
                  render={({ field }) => (
                    <Input
                      id="data"
                      inputMode="numeric"
                      placeholder="dd/mm/aaaa"
                      value={field.value}
                      onChange={(e) => field.onChange(maskDataBr(e.target.value))}
                    />
                  )}
                />
                {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">Dizimistas</h2>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={MAX_LINHAS_POR_VEZ}
                    inputMode="numeric"
                    value={quantidadeParaAdicionar}
                    onChange={(e) => setQuantidadeParaAdicionar(e.target.value)}
                    className="w-16"
                    aria-label="Quantidade de linhas para adicionar"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAdicionarLinhas}>
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar linhas
                  </Button>
                </div>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
                  onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                >
                  <div className="space-y-1.5">
                    {index === 0 && <Label htmlFor={`linhas.${index}.numeroCarne`}>Nº do carnê</Label>}
                    <Controller
                      control={control}
                      name={`linhas.${index}.numeroCarne`}
                      render={({ field: f }) => (
                        <>
                          <Input
                            id={`linhas.${index}.numeroCarne`}
                            inputMode="numeric"
                            placeholder="Nº do carnê"
                            disabled={f.value === CARNE_AVULSO}
                            {...f}
                          />
                          <label className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Checkbox
                              className="h-3.5 w-3.5"
                              checked={f.value === CARNE_AVULSO}
                              onCheckedChange={(v) => f.onChange(v ? CARNE_AVULSO : '')}
                            />
                            Avulsa (sem dizimista cadastrado)
                          </label>
                        </>
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
                            inputMode="decimal"
                            placeholder="0,00"
                            className="pl-9"
                            value={f.value}
                            onChange={(e) => f.onChange(maskMoeda(e.target.value))}
                            onBlur={() => f.onChange(finalizarMoeda(f.value ?? ''))}
                          />
                        )}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {/* Espaço invisível do tamanho do rótulo, só na 1ª linha — mantém o botão alinhado com os campos, não com o rótulo. */}
                    {index === 0 && <Label className="invisible hidden sm:block">Remover</Label>}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="justify-self-end sm:justify-self-auto"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                      aria-label="Remover linha"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={processando}>
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              {processando
                ? `Processando ${getValues('linhas').length} devolução(ões)...`
                : 'Processar lote'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {falhas.length > 0 && (
        <Card className="mt-6 max-w-3xl border-destructive/30">
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-semibold text-foreground">
                {falhas.length} registro(s) não puderam ser lançados
              </h2>
            </div>
            <ul className="space-y-2">
              {falhas.map((f, i) => (
                <li
                  key={`${f.numeroCarne}-${i}`}
                  className="flex flex-col gap-1 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0 truncate">
                    Carnê nº {f.numeroCarne || '(vazio)'} · {formatCurrency(f.valor)}
                  </span>
                  <span className="shrink-0 text-xs text-destructive">{f.mensagem}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
