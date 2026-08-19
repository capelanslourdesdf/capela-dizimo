import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeftRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { DadosDevolucao } from '@/services/devolucaoService'
import { listarMembrosPastoral } from '@/services/membroPastoralService'
import type { MembroPastoral } from '@/types'
import {
  competenciaAtual,
  competenciaParaMesAno,
  maskMesAno,
  maskMoeda,
  mesAnoEhValido,
  mesAnoParaCompetencia,
  moedaParaNumero,
} from '@/utils/format'
import { FORMAS_PAGAMENTO_DEVOLUCAO } from '@/constants/devolucao'
import { ROUTES } from '@/constants/routes'

const schema = z.object({
  valor: z.string().min(1, 'Informe o valor.'),
  formaPagamento: z.enum(['pix', 'cartao', 'dinheiro']),
  competencia: z
    .string()
    .regex(/^\d{2}\/\d{4}$/, 'Use o formato mm/aaaa.')
    .refine((valor) => mesAnoEhValido(valor), 'Informe um mês/ano válido.'),
  lancadoPor: z.string().min(1, 'Informe quem está lançando.'),
  observacao: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface DevolucaoFormProps {
  onSalvar: (dados: DadosDevolucao) => Promise<void>
  onCancelar: () => void
}

export function DevolucaoForm({ onSalvar, onCancelar }: DevolucaoFormProps) {
  const [erro, setErro] = React.useState<string | null>(null)
  const [membros, setMembros] = React.useState<MembroPastoral[]>([])
  const [carregandoMembros, setCarregandoMembros] = React.useState(true)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      formaPagamento: 'pix',
      competencia: competenciaParaMesAno(competenciaAtual()),
      lancadoPor: '',
    },
  })

  React.useEffect(() => {
    listarMembrosPastoral()
      .then(setMembros)
      .finally(() => setCarregandoMembros(false))
  }, [])

  async function onSubmit(values: FormValues) {
    setErro(null)
    const valor = moedaParaNumero(values.valor)
    if (valor <= 0) {
      setErro('Informe um valor válido.')
      return
    }

    try {
      await onSalvar({
        valor,
        formaPagamento: values.formaPagamento,
        competencia: mesAnoParaCompetencia(values.competencia),
        lancadoPor: values.lancadoPor,
        observacao: values.observacao,
      })
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Não foi possível lançar a devolução.'
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
                  onChange={(e) => field.onChange(maskMoeda(e.target.value))}
                />
              )}
            />
          </div>
          {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
        </div>
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
                value={field.value ?? ''}
                onChange={(e) => field.onChange(maskMesAno(e.target.value))}
              />
            )}
          />
          {errors.competencia ? (
            <p className="text-xs text-destructive">{errors.competencia.message}</p>
          ) : (
            <></>
          )}
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
                <SelectValue placeholder={carregandoMembros ? 'Carregando...' : 'Selecione o membro da Pastoral'} />
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
        {!carregandoMembros && membros.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhum membro cadastrado.{' '}
            <Link to={ROUTES.pastoral.membros} className="font-medium text-primary hover:underline">
              Cadastrar membros da Pastoral
            </Link>
          </p>
        )}
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
