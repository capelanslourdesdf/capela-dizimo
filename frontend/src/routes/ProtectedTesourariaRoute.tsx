import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useTesourariaSessao } from '@/hooks/useTesourariaSessao'
import { ROUTES } from '@/constants/routes'

export function ProtectedTesourariaRoute() {
  const { token, carregando } = useTesourariaSessao()
  const location = useLocation()

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    )
  }

  if (!token) {
    return <Navigate to={ROUTES.pastoral.tesouraria.entrar} state={{ from: location }} replace />
  }

  return <Outlet />
}
