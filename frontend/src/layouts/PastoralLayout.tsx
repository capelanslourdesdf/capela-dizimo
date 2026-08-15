import { Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { UserMenu } from '@/components/layout/UserMenu'
import { pastoralNav } from '@/constants/nav'
import { ROUTES } from '@/constants/routes'
import { useAdminSessao } from '@/hooks/useAdminSessao'

export function PastoralLayout() {
  const { sair } = useAdminSessao()
  const navigate = useNavigate()

  function handleSair() {
    sair()
    toast.success('Sessão encerrada. Até breve!')
    navigate(ROUTES.home)
  }

  const userMenu = <UserMenu nome="Pastoral do Dízimo" subtitulo="Administrador" onSair={handleSair} />

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar navItems={pastoralNav} areaLabel="Área da Pastoral" />

      <div className="lg:pl-64">
        <AppTopbar navItems={pastoralNav} areaLabel="Área da Pastoral" userMenu={userMenu} />
        <main className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
