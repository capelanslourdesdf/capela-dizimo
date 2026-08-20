import { TesourariaLoginForm } from '@/components/forms/TesourariaLoginForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function TesourariaLoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Tesouraria</CardTitle>
        <CardDescription>Selecione seu perfil e informe a senha para continuar.</CardDescription>
      </CardHeader>
      <CardContent>
        <TesourariaLoginForm />
      </CardContent>
    </Card>
  )
}
