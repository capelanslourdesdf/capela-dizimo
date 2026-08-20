import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { DizimistaSessaoProvider } from '@/hooks/useDizimistaSessao'
import { AdminSessaoProvider } from '@/hooks/useAdminSessao'
import { TesourariaSessaoProvider } from '@/hooks/useTesourariaSessao'
import { PageTitleProvider } from '@/hooks/usePageTitle'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

import { PublicLayout } from '@/layouts/PublicLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { PastoralLayout } from '@/layouts/PastoralLayout'
import { TesourariaLayout } from '@/layouts/TesourariaLayout'
import { DizimistaLayout } from '@/layouts/DizimistaLayout'
import { ProtectedAdminRoute } from '@/routes/ProtectedAdminRoute'
import { ProtectedTesourariaRoute } from '@/routes/ProtectedTesourariaRoute'
import { ProtectedDizimistaRoute } from '@/routes/ProtectedDizimistaRoute'
import { ProtegerContraPastoralDizimo } from '@/routes/ProtegerContraPastoralDizimo'
import { ScrollToTop } from '@/routes/ScrollToTop'

import { HomePage } from '@/pages/public/HomePage'
import { ComoFuncionaPage } from '@/pages/public/ComoFuncionaPage'
import { RecadastramentoPage } from '@/pages/public/RecadastramentoPage'
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage'
import { TesourariaLoginPage } from '@/pages/auth/TesourariaLoginPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { DizimistaDashboardPage } from '@/pages/dizimista/DashboardPage'
import { DizimistaCadastroPage } from '@/pages/dizimista/CadastroPage'
import { DizimistaDevolucoesPage } from '@/pages/dizimista/DevolucoesPage'
import { FazerDevolucaoPage } from '@/pages/dizimista/FazerDevolucaoPage'

import { DizimistasPage } from '@/pages/pastoral/DizimistasPage'
import { DizimistaDetalhePage } from '@/pages/pastoral/DizimistaDetalhePage'
import { RecadastramentosPage } from '@/pages/pastoral/RecadastramentosPage'
import { ConfiguracoesPage } from '@/pages/pastoral/ConfiguracoesPage'
import { LancamentoLotePage } from '@/pages/pastoral/LancamentoLotePage'
import { ListaDevolucoesPage } from '@/pages/pastoral/ListaDevolucoesPage'
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
            <PageTitleProvider>
            <TooltipProvider delayDuration={200}>
              <ScrollToTop />
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path={ROUTES.home} element={<HomePage />} />
                  <Route path={ROUTES.comoFunciona} element={<ComoFuncionaPage />} />
                </Route>

                <Route element={<AuthLayout />}>
                  <Route path={ROUTES.recadastramento} element={<RecadastramentoPage />} />
                  <Route path={ROUTES.pastoral.entrar} element={<AdminLoginPage />} />
                  <Route path={ROUTES.entrar} element={<LoginPage />} />
                </Route>

                {/* Área do dizimista: habilitada, mas sem nenhum link/botão visível apontando pra
                    cá em página pública — só é alcançada por quem já tem o link direto. Ver
                    constants/routes.ts. Pagamento via Pix real (Mercado Pago) segue fora do ar. */}
                <Route element={<ProtectedDizimistaRoute />}>
                  <Route element={<DizimistaLayout />}>
                    <Route path={ROUTES.dizimista.root} element={<DizimistaDashboardPage />} />
                    <Route path={ROUTES.dizimista.cadastro} element={<DizimistaCadastroPage />} />
                    <Route path={ROUTES.dizimista.devolucoes} element={<DizimistaDevolucoesPage />} />
                    <Route path={ROUTES.dizimista.fazerDevolucao} element={<FazerDevolucaoPage />} />
                  </Route>
                </Route>

                <Route element={<ProtectedAdminRoute />}>
                  <Route element={<PastoralLayout />}>
                    <Route path={ROUTES.pastoral.root} element={<DizimistasPage />} />
                    <Route path="/pastoral/dizimistas/:numeroCarne" element={<DizimistaDetalhePage />} />
                    <Route path={ROUTES.pastoral.recadastramentos} element={<RecadastramentosPage />} />
                    <Route path={ROUTES.pastoral.lancamentoLote} element={<LancamentoLotePage />} />
                    <Route path={ROUTES.pastoral.listaDevolucoes} element={<ListaDevolucoesPage />} />

                    {/* O perfil "Pastoral do Dízimo" não tem acesso a Configurações — ver
                        constants/papeisAcesso.ts. */}
                    <Route element={<ProtegerContraPastoralDizimo />}>
                      <Route path={ROUTES.pastoral.configuracoes} element={<ConfiguracoesPage />} />
                    </Route>
                  </Route>

                  {/* Tesouraria: só chega quem já está autenticado na Pastoral (e não é o perfil
                      "Pastoral do Dízimo"), e mesmo assim precisa de uma segunda senha
                      (ProtectedTesourariaRoute) — ver constants/senhasAcesso.ts. É uma área/visão
                      própria, com layout e navegação separados da Pastoral (TesourariaLayout, não
                      PastoralLayout). */}
                  <Route element={<ProtegerContraPastoralDizimo />}>
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
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>

              <Toaster />
            </TooltipProvider>
            </PageTitleProvider>
          </TesourariaSessaoProvider>
        </AdminSessaoProvider>
      </DizimistaSessaoProvider>
    </BrowserRouter>
  )
}

export default App
