import { Outlet, useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { toast } from 'sonner'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { UserMenu } from '@/components/layout/UserMenu'
import { tesourariaNav } from '@/constants/nav'
import { PAPEL_LABEL } from '@/constants/papeisAcesso'
import { ROUTES } from '@/constants/routes'
import { useTesourariaSessao } from '@/hooks/useTesourariaSessao'
import { useSidebarColapsada } from '@/hooks/useSidebarColapsada'
import { cn } from '@/lib/utils'

export function TesourariaLayout() {
  const { sair, papel, podeEditar } = useTesourariaSessao()
  const navigate = useNavigate()
  const { colapsada, alternar } = useSidebarColapsada()

  function handleSair() {
    sair()
    toast.success('Sessão da Tesouraria encerrada.')
    navigate(ROUTES.pastoral.root)
  }

  const userMenu = (
    <UserMenu nome="Tesouraria" subtitulo={papel ? PAPEL_LABEL[papel] : 'Pastoral do Dízimo'} onSair={handleSair} />
  )

  return (
    <div className="min-h-screen bg-[hsl(0deg_0%_92.54%/35%)]">
      <AppSidebar
        navItems={tesourariaNav}
        areaLabel="Tesouraria"
        colapsada={colapsada}
        aoAlternar={alternar}
        exibirNomeApp={false}
      />

      <div className={cn('transition-[padding] duration-200', colapsada ? 'lg:pl-[76px]' : 'lg:pl-72')}>
        <AppTopbar navItems={tesourariaNav} areaLabel="Tesouraria" userMenu={userMenu} exibirNomeApp={false} />
        <main className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          {!podeEditar && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-sm text-warning-foreground">
              <Eye className="h-4 w-4 shrink-0" />
              Modo somente visualização — seu perfil não pode incluir, editar ou excluir dados aqui.
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
