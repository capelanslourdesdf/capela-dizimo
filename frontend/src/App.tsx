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
import { ProtegerRotaPastoral } from '@/routes/ProtegerRotaPastoral'
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
import { LancamentoUnicoPage } from '@/pages/pastoral/LancamentoUnicoPage'
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
                  <Route path={ROUTES.pastoral.tesouraria.entrar} element={<TesourariaLoginPage />} />
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
                    {/* Cada papel só acessa um recorte destas rotas (mesmo digitando a URL direto)
                        — ver `podeAcessarRotaPastoral` em constants/papeisAcesso.ts. */}
                    <Route element={<ProtegerRotaPastoral />}>
                      <Route path={ROUTES.pastoral.root} element={<DizimistasPage />} />
                      <Route path="/pastoral/dizimistas/:numeroCarne" element={<DizimistaDetalhePage />} />
                      <Route path={ROUTES.pastoral.recadastramentos} element={<RecadastramentosPage />} />
                      <Route path={ROUTES.pastoral.lancamentoUnico} element={<LancamentoUnicoPage />} />
                      <Route path={ROUTES.pastoral.lancamentoLote} element={<LancamentoLotePage />} />
                      <Route path={ROUTES.pastoral.listaDevolucoes} element={<ListaDevolucoesPage />} />
                      <Route path={ROUTES.pastoral.configuracoes} element={<ConfiguracoesPage />} />
                    </Route>
                  </Route>
                </Route>

                {/* Tesouraria: área própria, com login, sessão (ProtectedTesourariaRoute) e
                    navegação (TesourariaLayout) totalmente independentes da Pastoral — dá pra
                    entrar direto em /tesouraria/entrar sem passar pelo Administrativo antes.
                    Quem já for da Pastoral (Coordenadora/Tesoureiro) continua alcançando aqui
                    pelo link "Tesouraria" do menu, mas não é obrigatório. O login da Tesouraria
                    já restringe sozinho quais perfis entram (PAPEIS_TESOURARIA, em
                    constants/papeisAcesso.ts) — "Pastoral do Dízimo" não é um deles. */}
                <Route element={<ProtectedTesourariaRoute />}>
                  <Route element={<TesourariaLayout />}>
                    <Route path={ROUTES.pastoral.tesouraria.root} element={<TesourariaPainelPage />} />
                    <Route path={ROUTES.pastoral.tesouraria.evolucao} element={<EvolucaoTesourariaPage />} />
                    <Route path={ROUTES.pastoral.tesouraria.eventos} element={<EventosPage />} />
                    <Route path="/tesouraria/:competencia" element={<ControleMensalPage />} />
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
