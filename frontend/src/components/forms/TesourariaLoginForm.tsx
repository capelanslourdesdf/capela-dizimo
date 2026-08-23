import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTesourariaSessao } from '@/hooks/useTesourariaSessao'
import { PAPEIS_TESOURARIA, PAPEL_LABEL } from '@/constants/papeisAcesso'
import { ROUTES } from '@/constants/routes'

const schema = z.object({
  papel: z.enum(['coordenadora', 'secretaria_paroquial', 'tesoureiro'], { message: 'Selecione um perfil.' }),
  senha: z.string().min(1, 'Informe a senha.'),
})

type FormValues = z.infer<typeof schema>

export function TesourariaLoginForm() {
  const { entrar } = useTesourariaSessao()
  const navigate = useNavigate()
  const location = useLocation()
  const [erro, setErro] = React.useState<string | null>(null)
  const [mostrarSenha, setMostrarSenha] = React.useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setErro(null)
    try {
      await entrar(values.papel, values.senha)
      toast.success('Bem-vindo(a) à Tesouraria.')
      // Quem chegou aqui redirecionado de uma página específica (ex.: /tesouraria/2026-08,
      // digitada direto sem estar logado) volta pra ela — ver `state: { from }` em
      // `ProtectedTesourariaRoute`. Sem isso, cai no Painel por padrão.
      const destino = (location.state as { from?: Location } | null)?.from
      navigate(destino ? `${destino.pathname}${destino.search}` : ROUTES.pastoral.tesouraria.root, { replace: true })
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
        <Label htmlFor="papel">Perfil</Label>
        <Controller
          control={control}
          name="papel"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="papel">
                <SelectValue placeholder="Selecione seu perfil" />
              </SelectTrigger>
              <SelectContent>
                {PAPEIS_TESOURARIA.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PAPEL_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.papel && <p className="text-xs text-destructive">{errors.papel.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="senha">Senha</Label>
        <div className="relative">
          <Controller
            control={control}
            name="senha"
            render={({ field }) => (
              <Input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-10"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
              />
            )}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
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
