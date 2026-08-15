import { AdminLoginForm } from '@/components/forms/AdminLoginForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AdminLoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Área da Pastoral do Dízimo</CardTitle>
        <CardDescription>Acesso restrito aos administradores.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminLoginForm />
      </CardContent>
    </Card>
  )
}
