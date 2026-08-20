import * as React from 'react'

import { STORAGE_KEYS } from '@/constants/storage'
import { PAPEIS_PASTORAL, type PapelAcesso } from '@/constants/papeisAcesso'
import { hashEsperadoParaPapel } from '@/constants/senhasAcesso'
import { sha256Hex } from '@/utils/hash'

const SESSAO_TTL_MS = 12 * 60 * 60 * 1000

interface SessaoAdminArmazenada {
  token: string
  papel: PapelAcesso
  expiresAt: number
}

interface AdminSessaoContextValue {
  token: string | null
  papel: PapelAcesso | null
  carregando: boolean
  entrar: (papel: PapelAcesso, senha: string) => Promise<void>
  sair: () => void
}

const AdminSessaoContext = React.createContext<AdminSessaoContextValue | undefined>(undefined)

function lerSessaoArmazenada(): { token: string; papel: PapelAcesso } | null {
  const bruto = localStorage.getItem(STORAGE_KEYS.adminSessao)
  if (!bruto) return null
  try {
    const sessao = JSON.parse(bruto) as SessaoAdminArmazenada
    if (!sessao.token || !sessao.papel || sessao.expiresAt < Date.now()) return null
    return { token: sessao.token, papel: sessao.papel }
  } catch {
    return null
  }
}

export function AdminSessaoProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null)
  const [papel, setPapel] = React.useState<PapelAcesso | null>(null)
  const [carregando, setCarregando] = React.useState(true)

  React.useEffect(() => {
    const sessao = lerSessaoArmazenada()
    setToken(sessao?.token ?? null)
    setPapel(sessao?.papel ?? null)
    setCarregando(false)
  }, [])

  const entrar = React.useCallback(async (papelEscolhido: PapelAcesso, senha: string) => {
    if (!PAPEIS_PASTORAL.includes(papelEscolhido)) {
      throw new Error('Perfil sem acesso ao Administrativo.')
    }

    const hashEsperado = hashEsperadoParaPapel(papelEscolhido)
    const senhaHash = await sha256Hex(senha)

    if (senhaHash !== hashEsperado) {
      throw new Error('Senha inválida para o perfil selecionado.')
    }

    const novoToken = crypto.randomUUID()
    const expiresAt = Date.now() + SESSAO_TTL_MS

    localStorage.setItem(STORAGE_KEYS.adminSessao, JSON.stringify({ token: novoToken, papel: papelEscolhido, expiresAt }))
    setToken(novoToken)
    setPapel(papelEscolhido)
  }, [])

  const sair = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.adminSessao)
    setToken(null)
    setPapel(null)
  }, [])

  const value = React.useMemo(
    () => ({ token, papel, carregando, entrar, sair }),
    [token, papel, carregando, entrar, sair],
  )

  return <AdminSessaoContext.Provider value={value}>{children}</AdminSessaoContext.Provider>
}

export function useAdminSessao(): AdminSessaoContextValue {
  const context = React.useContext(AdminSessaoContext)
  if (!context) throw new Error('useAdminSessao deve ser usado dentro de um AdminSessaoProvider.')
  return context
}
