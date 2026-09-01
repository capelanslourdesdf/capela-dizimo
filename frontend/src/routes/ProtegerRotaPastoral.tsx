import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAdminSessao } from '@/hooks/useAdminSessao'
import { podeAcessarRotaPastoral } from '@/constants/papeisAcesso'
import { ROUTES } from '@/constants/routes'

/**
 * Bloqueia cada papel de chegar numa rota da área da Pastoral que ele não deveria usar, mesmo
 * digitando a URL direto — o item já some do menu (`pastoralNavParaPapel`, em constants/nav.ts),
 * mas isso sozinho não impede a navegação direta. A regra de quem pode o quê fica centralizada em
 * `podeAcessarRotaPastoral` (constants/papeisAcesso.ts).
 */
export function ProtegerRotaPastoral() {
  const { papel } = useAdminSessao()
  const location = useLocation()

  if (!podeAcessarRotaPastoral(papel, location.pathname)) {
    return <Navigate to={ROUTES.pastoral.root} replace />
  }

  return <Outlet />
}
