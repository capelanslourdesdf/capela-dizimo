import { Link } from 'react-router-dom'

import { LoginForm } from '@/components/forms/LoginForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/constants/routes'

export function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Entrar na minha conta</CardTitle>
        <CardDescription>Informe o número do seu carnê e sua data de nascimento.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não fez seu recadastramento?{' '}
          <Link to={ROUTES.recadastramento} className="font-medium text-primary hover:underline">
            Recadastre-se aqui
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
