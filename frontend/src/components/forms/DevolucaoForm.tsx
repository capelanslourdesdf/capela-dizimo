import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeftRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { DadosDevolucao } from '@/services/devolucaoService'
import type { FormaPagamentoDevolucao } from '@/types'

const schema = z.object({
  valor: z.string().min(1, 'Informe o valor.'),
  formaPagamento: z.enum(['pix', 'dinheiro', 'transferencia', 'cheque']),
  data: z.string().min(1, 'Informe a data.'),
  observacao: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const formaOptions: { value: FormaPagamentoDevolucao; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cheque', label: 'Cheque' },
]

interface DevolucaoFormProps {
  onSalvar: (dados: DadosDevolucao) => Promise<void>
  onCancelar: () => void
}

export function DevolucaoForm({ onSalvar, onCancelar }: DevolucaoFormProps) {
  const [erro, setErro] = React.useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { formaPagamento: 'pix', data: new Date().toISOString().slice(0, 10) },
  })

  async function onSubmit(values: FormValues) {
    setErro(null)
    const valor = Number(values.valor.replace(',', '.'))
    if (!Number.isFinite(valor) || valor <= 0) {
      setErro('Informe um valor válido.')
      return
    }

    try {
      await onSalvar({
        valor,
        formaPagamento: values.formaPagamento,
        data: values.data,
        observacao: values.observacao,
      })
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível lançar a devolução.')
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
          <Label htmlFor="valor">Valor (R$)</Label>
          <Input id="valor" inputMode="decimal" placeholder="0,00" {...register('valor')} />
          {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="data">Data</Label>
          <Input id="data" type="date" {...register('data')} />
          {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
        </div>
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
                {formaOptions.map((op) => (
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
        <Label htmlFor="observacao">Observação (opcional)</Label>
        <Textarea id="observacao" rows={3} {...register('observacao')} />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <ArrowLeftRight className="h-4 w-4" />
          {isSubmitting ? 'Lançando...' : 'Lançar devolução'}
        </Button>
      </div>
    </form>
  )
}
