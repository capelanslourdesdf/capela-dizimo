import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TrendingDown } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { SaidaTesouraria } from '@/types'
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
  dia: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use o formato dd/mm/aaaa.')
    .refine((valor) => dataBrEhValida(valor), 'Informe uma data válida.'),
  solicitante: z.string().trim().min(1, 'Informe quem solicitou.'),
  prestador: z.string().trim().min(1, 'Informe a empresa/prestador.'),
  valor: z.string().min(1, 'Informe o valor.'),
  quitado: z.boolean(),
  observacao: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export interface DadosDespesaTesouraria {
  dia: string
  solicitante: string
  prestador: string
  valor: number
  quitado: boolean
  observacao?: string
}

interface DespesaTesourariaFormProps {
  /** Presente só na edição — quando ausente, o form lança uma despesa nova. */
  despesa?: SaidaTesouraria
  /** Data padrão sugerida ao lançar uma despesa nova (dd/mm/aaaa). */
  dataPadrao: string
  onSalvar: (dados: DadosDespesaTesouraria) => Promise<void>
  onCancelar: () => void
}

export function DespesaTesourariaForm({ despesa, dataPadrao, onSalvar, onCancelar }: DespesaTesourariaFormProps) {
  const [erro, setErro] = React.useState<string | null>(null)
  const editando = !!despesa

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dia: despesa ? dataIsoParaBr(despesa.dia) : dataPadrao,
      solicitante: despesa?.solicitante ?? '',
      prestador: despesa?.prestador ?? '',
      valor: despesa ? numeroParaMoeda(despesa.valor) : '',
      quitado: despesa?.quitado ?? false,
      observacao: despesa?.observacao ?? '',
    },
  })

  /** Registra um campo de texto normalizando para MAIÚSCULAS enquanto o usuário digita. */
  function registrarMaiusculo(nome: 'solicitante' | 'prestador') {
    const campo = register(nome)
    return {
      ...campo,
      onChange: (evento: { target: HTMLInputElement; type?: unknown }) => {
        evento.target.value = evento.target.value.toUpperCase()
        return campo.onChange(evento)
      },
    }
  }

  async function onSubmit(values: FormValues) {
    setErro(null)
    const valor = moedaParaNumero(values.valor)
    if (valor <= 0) {
      setErro('Informe um valor válido.')
      return
    }

    try {
      await onSalvar({
        dia: dataBrParaIso(values.dia),
        solicitante: values.solicitante.trim(),
        prestador: values.prestador.trim(),
        valor,
        quitado: values.quitado,
        observacao: values.observacao,
      })
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : `Não foi possível ${editando ? 'salvar' : 'lançar'} a despesa.`
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
          <Label htmlFor="dia">Data</Label>
          <Controller
            control={control}
            name="dia"
            render={({ field }) => (
              <Input
                id="dia"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(maskDataBr(e.target.value))}
              />
            )}
          />
          {errors.dia && <p className="text-xs text-destructive">{errors.dia.message}</p>}
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
          <Label htmlFor="solicitante">Quem solicitou</Label>
          <Input id="solicitante" {...registrarMaiusculo('solicitante')} />
          {errors.solicitante && <p className="text-xs text-destructive">{errors.solicitante.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prestador">Empresa/Prestador</Label>
          <Input id="prestador" {...registrarMaiusculo('prestador')} />
          {errors.prestador && <p className="text-xs text-destructive">{errors.prestador.message}</p>}
        </div>
      </div>

      <Controller
        control={control}
        name="quitado"
        render={({ field }) => (
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-input px-3.5 py-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
            <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
            Despesa quitada (já paga)
          </label>
        )}
      />

      <div className="space-y-1.5">
        <Label htmlFor="observacao">Observação (opcional)</Label>
        <Textarea id="observacao" rows={3} {...register('observacao')} />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <TrendingDown className="h-4 w-4" />
          {editando ? (isSubmitting ? 'Salvando...' : 'Salvar alterações') : isSubmitting ? 'Lançando...' : 'Lançar despesa'}
        </Button>
      </div>
    </form>
  )
}
