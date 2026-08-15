import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAdminSessao } from '@/hooks/useAdminSessao'
import { ROUTES } from '@/constants/routes'

export function ProtectedAdminRoute() {
  const { token, carregando } = useAdminSessao()
  const location = useLocation()

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    )
  }

  if (!token) {
    return <Navigate to={ROUTES.pastoral.entrar} state={{ from: location }} replace />
  }

  return <Outlet />
}
