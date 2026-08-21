import { Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { UserMenu } from '@/components/layout/UserMenu'
import { dizimistaNav } from '@/constants/nav'
import { ROUTES } from '@/constants/routes'
import { useDizimistaSessao } from '@/hooks/useDizimistaSessao'
import { useSidebarColapsada } from '@/hooks/useSidebarColapsada'
import { cn } from '@/lib/utils'

export function DizimistaLayout() {
  const { numeroCarne, dizimista, sair } = useDizimistaSessao()
  const navigate = useNavigate()
  const { colapsada, alternar } = useSidebarColapsada()

  function handleSair() {
    sair()
    toast.success('Sessão encerrada. Até breve!')
    navigate(ROUTES.home)
  }

  const userMenu = (
    <UserMenu
      nome={dizimista?.nomeCompleto || 'Dizimista'}
      subtitulo={`Carnê nº ${numeroCarne}`}
      onSair={handleSair}
    />
  )

  return (
    <div className="min-h-screen bg-[hsl(0deg_0%_92.54%/35%)]">
      <AppSidebar navItems={dizimistaNav} areaLabel="Área do Dizimista" colapsada={colapsada} aoAlternar={alternar} />

      <div className={cn('transition-[padding] duration-200', colapsada ? 'lg:pl-[76px]' : 'lg:pl-72')}>
        <AppTopbar navItems={dizimistaNav} areaLabel="Área do Dizimista" userMenu={userMenu} />
        <main className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
