import * as React from 'react'

import { STORAGE_KEYS } from '@/constants/storage'

interface SessaoAdminArmazenada {
  token: string
  expiresAt: number
}

interface AdminSessaoContextValue {
  token: string | null
  carregando: boolean
  entrar: (usuario: string, senha: string) => Promise<void>
  sair: () => void
}

const AdminSessaoContext = React.createContext<AdminSessaoContextValue | undefined>(undefined)

function lerSessaoArmazenada(): string | null {
  const bruto = localStorage.getItem(STORAGE_KEYS.adminSessao)
  if (!bruto) return null
  try {
    const sessao = JSON.parse(bruto) as SessaoAdminArmazenada
    if (!sessao.token || sessao.expiresAt < Date.now()) return null
    return sessao.token
  } catch {
    return null
  }
}

export function AdminSessaoProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null)
  const [carregando, setCarregando] = React.useState(true)

  React.useEffect(() => {
    setToken(lerSessaoArmazenada())
    setCarregando(false)
  }, [])

  const entrar = React.useCallback(async (usuario: string, senha: string) => {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha }),
    })

    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; token?: string; expiresAt?: number }

    if (!response.ok || !payload.ok || !payload.token || !payload.expiresAt) {
      throw new Error('Usuário ou senha inválidos.')
    }

    localStorage.setItem(
      STORAGE_KEYS.adminSessao,
      JSON.stringify({ token: payload.token, expiresAt: payload.expiresAt }),
    )
    setToken(payload.token)
  }, [])

  const sair = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.adminSessao)
    setToken(null)
  }, [])

  const value = React.useMemo(() => ({ token, carregando, entrar, sair }), [token, carregando, entrar, sair])

  return <AdminSessaoContext.Provider value={value}>{children}</AdminSessaoContext.Provider>
}

export function useAdminSessao(): AdminSessaoContextValue {
  const context = React.useContext(AdminSessaoContext)
  if (!context) throw new Error('useAdminSessao deve ser usado dentro de um AdminSessaoProvider.')
  return context
}
