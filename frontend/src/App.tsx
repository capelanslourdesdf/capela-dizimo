import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { DizimistaSessaoProvider } from '@/hooks/useDizimistaSessao'
import { AdminSessaoProvider } from '@/hooks/useAdminSessao'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

import { PublicLayout } from '@/layouts/PublicLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DizimistaLayout } from '@/layouts/DizimistaLayout'
import { PastoralLayout } from '@/layouts/PastoralLayout'
import { ProtectedDizimistaRoute } from '@/routes/ProtectedDizimistaRoute'
import { ProtectedAdminRoute } from '@/routes/ProtectedAdminRoute'

import { HomePage } from '@/pages/public/HomePage'
import { DizimoPage } from '@/pages/public/DizimoPage'
import { ComoFuncionaPage } from '@/pages/public/ComoFuncionaPage'
import { RecadastramentoPage } from '@/pages/public/RecadastramentoPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { DizimistaDashboardPage } from '@/pages/dizimista/DashboardPage'
import { DizimistaCadastroPage } from '@/pages/dizimista/CadastroPage'
import { DizimistaPagamentoPage } from '@/pages/dizimista/PagamentoPage'
import { DizimistaPagamentosPage } from '@/pages/dizimista/PagamentosPage'

import { DizimistasPage } from '@/pages/pastoral/DizimistasPage'
import { DizimistaDetalhePage } from '@/pages/pastoral/DizimistaDetalhePage'
import { RecadastramentosPage } from '@/pages/pastoral/RecadastramentosPage'
import { MembrosPastoralPage } from '@/pages/pastoral/MembrosPage'

import { ROUTES } from '@/constants/routes'

function App() {
  return (
    <BrowserRouter>
      <DizimistaSessaoProvider>
        <AdminSessaoProvider>
          <TooltipProvider delayDuration={200}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path={ROUTES.home} element={<HomePage />} />
                <Route path={ROUTES.dizimo} element={<DizimoPage />} />
                <Route path={ROUTES.comoFunciona} element={<ComoFuncionaPage />} />
              </Route>

              <Route element={<AuthLayout />}>
                <Route path={ROUTES.recadastramento} element={<RecadastramentoPage />} />
                <Route path={ROUTES.entrar} element={<LoginPage />} />
                <Route path={ROUTES.pastoral.entrar} element={<AdminLoginPage />} />
              </Route>

              <Route element={<ProtectedDizimistaRoute />}>
                <Route element={<DizimistaLayout />}>
                  <Route path={ROUTES.dizimista.root} element={<DizimistaDashboardPage />} />
                  <Route path={ROUTES.dizimista.cadastro} element={<DizimistaCadastroPage />} />
                  <Route path={ROUTES.dizimista.pagamento} element={<DizimistaPagamentoPage />} />
                  <Route path={ROUTES.dizimista.pagamentos} element={<DizimistaPagamentosPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedAdminRoute />}>
                <Route element={<PastoralLayout />}>
                  <Route path={ROUTES.pastoral.root} element={<DizimistasPage />} />
                  <Route path="/pastoral/dizimistas/:numeroCarne" element={<DizimistaDetalhePage />} />
                  <Route path={ROUTES.pastoral.recadastramentos} element={<RecadastramentosPage />} />
                  <Route path={ROUTES.pastoral.membros} element={<MembrosPastoralPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>

            <Toaster />
          </TooltipProvider>
        </AdminSessaoProvider>
      </DizimistaSessaoProvider>
    </BrowserRouter>
  )
}

export default App
