import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { DizimistaSessaoProvider } from '@/hooks/useDizimistaSessao'
import { AdminSessaoProvider } from '@/hooks/useAdminSessao'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

import { PublicLayout } from '@/layouts/PublicLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { PastoralLayout } from '@/layouts/PastoralLayout'
import { ProtectedAdminRoute } from '@/routes/ProtectedAdminRoute'

import { HomePage } from '@/pages/public/HomePage'
import { ComoFuncionaPage } from '@/pages/public/ComoFuncionaPage'
import { RecadastramentoPage } from '@/pages/public/RecadastramentoPage'
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { DizimistasPage } from '@/pages/pastoral/DizimistasPage'
import { DizimistaDetalhePage } from '@/pages/pastoral/DizimistaDetalhePage'
import { RecadastramentosPage } from '@/pages/pastoral/RecadastramentosPage'
import { MembrosPastoralPage } from '@/pages/pastoral/MembrosPage'
import { LancamentoLotePage } from '@/pages/pastoral/LancamentoLotePage'

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
