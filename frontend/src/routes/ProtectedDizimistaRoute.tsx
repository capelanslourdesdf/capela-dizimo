import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useDizimistaSessao } from '@/hooks/useDizimistaSessao'
import { ROUTES } from '@/constants/routes'

export function ProtectedDizimistaRoute() {
  const { numeroCarne, carregando } = useDizimistaSessao()
  const location = useLocation()

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    )
  }

  if (!numeroCarne) {
    return <Navigate to={ROUTES.entrar} state={{ from: location }} replace />
  }

  return <Outlet />
}
