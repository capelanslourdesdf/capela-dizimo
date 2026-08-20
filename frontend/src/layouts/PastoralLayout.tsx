import { Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { UserMenu } from '@/components/layout/UserMenu'
import { pastoralNavParaPapel } from '@/constants/nav'
import { PAPEL_LABEL } from '@/constants/papeisAcesso'
import { ROUTES } from '@/constants/routes'
import { useAdminSessao } from '@/hooks/useAdminSessao'
import { useSidebarColapsada } from '@/hooks/useSidebarColapsada'
import { cn } from '@/lib/utils'

export function PastoralLayout() {
  const { sair, papel } = useAdminSessao()
  const navigate = useNavigate()
  const { colapsada, alternar } = useSidebarColapsada()

  function handleSair() {
    sair()
    toast.success('Sessão encerrada. Até breve!')
    navigate(ROUTES.home)
  }

  const nav = pastoralNavParaPapel(papel)
  const userMenu = (
    <UserMenu nome="Pastoral do Dízimo" subtitulo={papel ? PAPEL_LABEL[papel] : undefined} onSair={handleSair} />
  )

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar navItems={nav} areaLabel="Administrativo" colapsada={colapsada} aoAlternar={alternar} />

      <div className={cn('transition-[padding] duration-200', colapsada ? 'lg:pl-[76px]' : 'lg:pl-64')}>
        <AppTopbar navItems={nav} areaLabel="Administrativo" userMenu={userMenu} />
        <main className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
