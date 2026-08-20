import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { EntradaTesouraria, FormaPagamentoDevolucao } from '@/types'
import { CATEGORIAS_ENTRADA_TESOURARIA } from '@/constants/tesouraria'
import { FORMAS_PAGAMENTO_DEVOLUCAO } from '@/constants/devolucao'
import {
  dataBrEhValida,
  dataBrParaIso,
  dataIsoParaBr,
  maskDataBr,
  maskMoedaCentavos,
  moedaParaNumero,
  numeroParaMoeda,
} from '@/utils/format'

const schema = z.object({
  data: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use o formato dd/mm/aaaa.')
    .refine((valor) => dataBrEhValida(valor), 'Informe uma data válida.'),
  valor: z.string().min(1, 'Informe o valor.'),
  formaPagamento: z.enum(['pix', 'cartao', 'dinheiro']),
  categoria: z.enum(['dizimo', 'oferta', 'bazar', 'lojinha', 'eventos', 'acao_solidaria', 'doacoes']),
  observacao: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export interface DadosReceitaTesouraria {
  data: string
  valor: number
  formaPagamento: FormaPagamentoDevolucao
  categoria: FormValues['categoria']
  observacao?: string
}

interface ReceitaTesourariaFormProps {
  /** Presente só na edição — quando ausente, o form lança uma receita nova. */
  receita?: EntradaTesouraria
  onSalvar: (dados: DadosReceitaTesouraria) => Promise<void>
  onCancelar: () => void
}

export function ReceitaTesourariaForm({ receita, onSalvar, onCancelar }: ReceitaTesourariaFormProps) {
  const [erro, setErro] = React.useState<string | null>(null)
  const editando = !!receita

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      data: receita ? dataIsoParaBr(receita.data) : '',
      valor: receita ? numeroParaMoeda(receita.valor) : '',
      formaPagamento: receita?.formaPagamento ?? 'pix',
      categoria: receita?.categoria ?? 'dizimo',
      observacao: receita?.observacao ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    setErro(null)
    const valor = moedaParaNumero(values.valor)
    if (valor <= 0) {
      setErro('Informe um valor válido.')
      return
    }

    try {
      await onSalvar({
        data: dataBrParaIso(values.data),
        valor,
        formaPagamento: values.formaPagamento,
        categoria: values.categoria,
        observacao: values.observacao,
      })
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : `Não foi possível ${editando ? 'salvar' : 'lançar'} a receita.`
      setErro(mensagem)
      toast.error(mensagem)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="data">Data</Label>
          <Controller
            control={control}
            name="data"
            render={({ field }) => (
              <Input
                id="data"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(maskDataBr(e.target.value))}
              />
            )}
          />
          {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="valor">Valor</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              R$
            </span>
            <Controller
              control={control}
              name="valor"
              render={({ field }) => (
                <Input
                  id="valor"
                  inputMode="numeric"
                  placeholder="0,00"
                  className="pl-9"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(maskMoedaCentavos(e.target.value))}
                />
              )}
            />
          </div>
          {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoria</Label>
          <Controller
            control={control}
            name="categoria"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_ENTRADA_TESOURARIA.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacao">Observação (opcional)</Label>
        <Textarea id="observacao" rows={3} {...register('observacao')} />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <TrendingUp className="h-4 w-4" />
          {editando ? (isSubmitting ? 'Salvando...' : 'Salvar alterações') : isSubmitting ? 'Lançando...' : 'Lançar receita'}
        </Button>
      </div>
    </form>
  )
}
