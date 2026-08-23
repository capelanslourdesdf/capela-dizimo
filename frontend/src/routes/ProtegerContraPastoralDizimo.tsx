import { Navigate, Outlet } from 'react-router-dom'

import { useAdminSessao } from '@/hooks/useAdminSessao'
import { podeAcessarConfiguracoesETesouraria } from '@/constants/papeisAcesso'
import { ROUTES } from '@/constants/routes'

/**
 * Bloqueia o perfil "Pastoral do Dízimo" de chegar em Configurações mesmo digitando a URL direto
 * — o item some do menu (`pastoralNavParaPapel`), mas isso sozinho não impede a navegação direta,
 * por isso o guard na rota. (A Tesouraria já tem seu próprio login/sessão independentes — ver
 * `ProtectedTesourariaRoute` — e o login dela já recusa esse perfil sozinho, então não precisa
 * desse guard.)
 */
export function ProtegerContraPastoralDizimo() {
  const { papel } = useAdminSessao()

  if (!podeAcessarConfiguracoesETesouraria(papel)) {
    return <Navigate to={ROUTES.pastoral.root} replace />
  }

  return <Outlet />
}
