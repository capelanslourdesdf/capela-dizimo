import * as React from 'react'

import { STORAGE_KEYS } from '@/constants/storage'
import {
  ADMIN_SENHA_HASH,
  ADMIN_SENHA_HASH_PADRAO,
  ADMIN_SENHA_TEXTO,
  ADMIN_USUARIO,
} from '@/constants/adminAuth'
import { sha256Hex } from '@/utils/hash'

const SESSAO_TTL_MS = 12 * 60 * 60 * 1000

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
    // Ordem de precedência: hash configurado > senha em texto na env > hash padrão do código.
    const hashEsperado = ADMIN_SENHA_HASH || (ADMIN_SENHA_TEXTO ? await sha256Hex(ADMIN_SENHA_TEXTO) : ADMIN_SENHA_HASH_PADRAO)
    const senhaHash = await sha256Hex(senha)

    if (usuario.trim() !== ADMIN_USUARIO || senhaHash !== hashEsperado) {
      throw new Error('Usuário ou senha inválidos.')
    }

    const novoToken = crypto.randomUUID()
    const expiresAt = Date.now() + SESSAO_TTL_MS

    localStorage.setItem(STORAGE_KEYS.adminSessao, JSON.stringify({ token: novoToken, expiresAt }))
    setToken(novoToken)
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
