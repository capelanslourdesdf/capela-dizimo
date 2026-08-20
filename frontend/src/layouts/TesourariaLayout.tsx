import { Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { UserMenu } from '@/components/layout/UserMenu'
import { Button } from '@/components/ui/button'
import { tesourariaNav } from '@/constants/nav'
import { ROUTES } from '@/constants/routes'
import { useTesourariaSessao } from '@/hooks/useTesourariaSessao'

export function TesourariaLayout() {
  const { sair } = useTesourariaSessao()
  const navigate = useNavigate()

  function handleSair() {
    sair()
    toast.success('Sessão da Tesouraria encerrada.')
    navigate(ROUTES.pastoral.root)
  }

  const userMenu = <UserMenu nome="Tesouraria" subtitulo="Pastoral do Dízimo" onSair={handleSair} />

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar navItems={tesourariaNav} areaLabel="Tesouraria" />

      <div className="lg:pl-64">
        <AppTopbar navItems={tesourariaNav} areaLabel="Tesouraria" userMenu={userMenu} />
        <main className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate(ROUTES.pastoral.root)}>
            <ArrowLeft className="h-4 w-4" />
            Voltar à área da Pastoral
          </Button>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
