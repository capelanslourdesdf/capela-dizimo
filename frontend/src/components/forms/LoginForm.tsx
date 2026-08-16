import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDizimistaSessao } from '@/hooks/useDizimistaSessao'
import { ROUTES } from '@/constants/routes'
import { diaMesEhValido, maskDiaMes } from '@/utils/format'

const schema = z.object({
  numeroCarne: z.string().trim().min(1, 'Informe o número do carnê.'),
  diaMesNascimento: z
    .string()
    .regex(/^\d{2}\/\d{2}$/, 'Use o formato dd/mm.')
    .refine((valor) => diaMesEhValido(valor), 'Informe um dia e mês válidos.'),
})

type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const { entrar } = useDizimistaSessao()
  const navigate = useNavigate()
  const [erro, setErro] = React.useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setErro(null)
    try {
      const dizimista = await entrar(values.numeroCarne, values.diaMesNascimento)
      toast.success(`Bem-vindo(a), ${dizimista.nomeCompleto.split(' ')[0]}!`)
      navigate(ROUTES.dizimista.root)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível entrar. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="numeroCarne">Nº do carnê</Label>
        <Input id="numeroCarne" inputMode="numeric" placeholder="Número impresso no carnê" autoComplete="off" {...register('numeroCarne')} />
        {errors.numeroCarne && <p className="text-xs text-destructive">{errors.numeroCarne.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="diaMesNascimento">Dia e mês de nascimento</Label>
        <Controller
          control={control}
          name="diaMesNascimento"
          render={({ field }) => (
            <Input
              id="diaMesNascimento"
              inputMode="numeric"
              placeholder="dd/mm"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(maskDiaMes(e.target.value))}
            />
          )}
        />
        {errors.diaMesNascimento && <p className="text-xs text-destructive">{errors.diaMesNascimento.message}</p>}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        <LogIn className="h-4 w-4" />
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
