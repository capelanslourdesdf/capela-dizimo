import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PartyPopper } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { DadosEventoTesouraria } from '@/services/tesourariaService'
import type { EventoTesouraria } from '@/types'
import { ANO_INICIAL_EVENTOS_TESOURARIA } from '@/constants/tesouraria'
import {
  dataBrEhValida,
  dataBrParaIso,
  dataIsoParaBr,
  finalizarMoeda,
  maskDataBr,
  maskMoeda,
  moedaParaNumero,
  numeroParaMoeda,
} from '@/utils/format'

const schema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do evento.'),
  data: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use o formato dd/mm/aaaa.')
    .refine((valor) => dataBrEhValida(valor), 'Informe uma data válida.')
    .refine(
      (valor) => Number(valor.slice(6, 10)) >= ANO_INICIAL_EVENTOS_TESOURARIA,
      `Informe uma data a partir de ${ANO_INICIAL_EVENTOS_TESOURARIA}.`,
    ),
  arrecadado: z.string(),
  despesa: z.string(),
  observacao: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface EventoTesourariaFormProps {
  evento?: EventoTesouraria
  onSalvar: (dados: DadosEventoTesouraria) => Promise<void>
  onCancelar: () => void
}

export function EventoTesourariaForm({ evento, onSalvar, onCancelar }: EventoTesourariaFormProps) {
  const [erro, setErro] = React.useState<string | null>(null)
  const editando = !!evento

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: evento?.nome ?? '',
      data: evento ? dataIsoParaBr(evento.data) : dataIsoParaBr(new Date().toISOString().slice(0, 10)),
      arrecadado: evento ? numeroParaMoeda(evento.arrecadado) : '',
      despesa: evento ? numeroParaMoeda(evento.despesa) : '',
      observacao: evento?.observacao ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    setErro(null)
    try {
      await onSalvar({
        nome: values.nome.trim(),
        // O ano é sempre o da data do evento — não faz sentido a pessoa preencher os dois
        // separadamente e correr o risco de ficarem incoerentes.
        ano: Number(values.data.slice(6, 10)),
        data: dataBrParaIso(values.data),
        arrecadado: moedaParaNumero(values.arrecadado),
        despesa: moedaParaNumero(values.despesa),
        observacao: values.observacao?.trim() || undefined,
      })
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : `Não foi possível ${editando ? 'salvar' : 'lançar'} o evento.`
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

      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome do evento</Label>
        <Input id="nome" {...register('nome')} />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="data">Data do evento</Label>
        <Controller
          control={control}
          name="data"
          render={({ field }) => (
            <Input
              id="data"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              className="max-w-[10rem]"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(maskDataBr(e.target.value))}
            />
          )}
        />
        {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="arrecadado">Arrecadado</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              R$
            </span>
            <Controller
              control={control}
              name="arrecadado"
              render={({ field }) => (
                <Input
                  id="arrecadado"
                  inputMode="decimal"
                  placeholder="0,00"
                  className="pl-9"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(maskMoeda(e.target.value))}
                  onBlur={() => field.onChange(finalizarMoeda(field.value ?? ''))}
                />
              )}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="despesa">Despesa</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              R$
            </span>
            <Controller
              control={control}
              name="despesa"
              render={({ field }) => (
                <Input
                  id="despesa"
                  inputMode="decimal"
                  placeholder="0,00"
                  className="pl-9"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(maskMoeda(e.target.value))}
                  onBlur={() => field.onChange(finalizarMoeda(field.value ?? ''))}
                />
              )}
            />
          </div>
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
          <PartyPopper className="h-4 w-4" />
          {editando ? (isSubmitting ? 'Salvando...' : 'Salvar alterações') : isSubmitting ? 'Lançando...' : 'Lançar evento'}
        </Button>
      </div>
    </form>
  )
}
