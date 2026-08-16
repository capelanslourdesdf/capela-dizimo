import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAdminSessao } from '@/hooks/useAdminSessao'
import { ROUTES } from '@/constants/routes'

const schema = z.object({
  usuario: z.string().min(1, 'Informe o usuário.'),
  senha: z.string().min(1, 'Informe a senha.'),
})

type FormValues = z.infer<typeof schema>

export function AdminLoginForm() {
  const { entrar } = useAdminSessao()
  const navigate = useNavigate()
  const [erro, setErro] = React.useState<string | null>(null)
  const [mostrarSenha, setMostrarSenha] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setErro(null)
    try {
      await entrar(values.usuario, values.senha)
      toast.success('Bem-vindo(a) à Pastoral do Dízimo.')
      navigate(ROUTES.pastoral.root)
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
        <Label htmlFor="usuario">Usuário</Label>
        <Input id="usuario" autoComplete="username" {...register('usuario')} />
        {errors.usuario && <p className="text-xs text-destructive">{errors.usuario.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="senha">Senha</Label>
        <div className="relative">
          <Input
            id="senha"
            type={mostrarSenha ? 'text' : 'password'}
            autoComplete="current-password"
            className="pr-10"
            {...register('senha')}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.senha && <p className="text-xs text-destructive">{errors.senha.message}</p>}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        <LogIn className="h-4 w-4" />
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
