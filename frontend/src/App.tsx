import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { DizimistaSessaoProvider } from '@/hooks/useDizimistaSessao'
import { AdminSessaoProvider } from '@/hooks/useAdminSessao'
import { TesourariaSessaoProvider } from '@/hooks/useTesourariaSessao'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

import { PublicLayout } from '@/layouts/PublicLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { PastoralLayout } from '@/layouts/PastoralLayout'
import { TesourariaLayout } from '@/layouts/TesourariaLayout'
import { ProtectedAdminRoute } from '@/routes/ProtectedAdminRoute'
import { ProtectedTesourariaRoute } from '@/routes/ProtectedTesourariaRoute'

import { HomePage } from '@/pages/public/HomePage'
import { ComoFuncionaPage } from '@/pages/public/ComoFuncionaPage'
import { RecadastramentoPage } from '@/pages/public/RecadastramentoPage'
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage'
import { TesourariaLoginPage } from '@/pages/auth/TesourariaLoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { DizimistasPage } from '@/pages/pastoral/DizimistasPage'
import { DizimistaDetalhePage } from '@/pages/pastoral/DizimistaDetalhePage'
import { RecadastramentosPage } from '@/pages/pastoral/RecadastramentosPage'
import { ConfiguracoesPage } from '@/pages/pastoral/ConfiguracoesPage'
import { LancamentoLotePage } from '@/pages/pastoral/LancamentoLotePage'
import { TesourariaPainelPage } from '@/pages/tesouraria/TesourariaPainelPage'
import { ControleMensalPage } from '@/pages/tesouraria/ControleMensalPage'
import { EventosPage } from '@/pages/tesouraria/EventosPage'
import { EvolucaoTesourariaPage } from '@/pages/tesouraria/EvolucaoTesourariaPage'

import { ROUTES } from '@/constants/routes'

function App() {
  return (
    <BrowserRouter>
      <DizimistaSessaoProvider>
        <AdminSessaoProvider>
          <TesourariaSessaoProvider>
            <TooltipProvider delayDuration={200}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path={ROUTES.home} element={<HomePage />} />
                  <Route path={ROUTES.comoFunciona} element={<ComoFuncionaPage />} />
                </Route>

                <Route element={<AuthLayout />}>
                  <Route path={ROUTES.recadastramento} element={<RecadastramentoPage />} />
                  <Route path={ROUTES.pastoral.entrar} element={<AdminLoginPage />} />
                </Route>

                {/* Área do dizimista (login + dashboard) temporariamente fora do ar — só
                    recadastramento fica acessível ao público. Ver constants/routes.ts. */}

                <Route element={<ProtectedAdminRoute />}>
                  <Route element={<PastoralLayout />}>
                    <Route path={ROUTES.pastoral.root} element={<DizimistasPage />} />
                    <Route path="/pastoral/dizimistas/:numeroCarne" element={<DizimistaDetalhePage />} />
                    <Route path={ROUTES.pastoral.recadastramentos} element={<RecadastramentosPage />} />
                    <Route path={ROUTES.pastoral.lancamentoLote} element={<LancamentoLotePage />} />
                    <Route path={ROUTES.pastoral.configuracoes} element={<ConfiguracoesPage />} />
                  </Route>

                  {/* Tesouraria: só chega quem já está autenticado na Pastoral, e mesmo assim
                      precisa de uma segunda senha (ProtectedTesourariaRoute) — ver
                      constants/tesourariaAuth.ts. É uma área/visão própria, com layout e
                      navegação separados da Pastoral (TesourariaLayout, não PastoralLayout). */}
                  <Route element={<AuthLayout />}>
                    <Route path={ROUTES.pastoral.tesouraria.entrar} element={<TesourariaLoginPage />} />
                  </Route>

                  <Route element={<ProtectedTesourariaRoute />}>
                    <Route element={<TesourariaLayout />}>
                      <Route path={ROUTES.pastoral.tesouraria.root} element={<TesourariaPainelPage />} />
                      <Route path={ROUTES.pastoral.tesouraria.evolucao} element={<EvolucaoTesourariaPage />} />
                      <Route path={ROUTES.pastoral.tesouraria.eventos} element={<EventosPage />} />
                      <Route path="/pastoral/tesouraria/:competencia" element={<ControleMensalPage />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>

              <Toaster />
            </TooltipProvider>
          </TesourariaSessaoProvider>
        </AdminSessaoProvider>
      </DizimistaSessaoProvider>
    </BrowserRouter>
  )
}

export default App
