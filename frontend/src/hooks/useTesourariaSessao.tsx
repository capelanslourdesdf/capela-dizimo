import * as React from 'react'

import { STORAGE_KEYS } from '@/constants/storage'
import { TESOURARIA_SENHA_HASH, TESOURARIA_SENHA_HASH_PADRAO } from '@/constants/tesourariaAuth'
import { sha256Hex } from '@/utils/hash'

const SESSAO_TTL_MS = 12 * 60 * 60 * 1000

interface SessaoTesourariaArmazenada {
  token: string
  expiresAt: number
}

interface TesourariaSessaoContextValue {
  token: string | null
  carregando: boolean
  entrar: (senha: string) => Promise<void>
  sair: () => void
}

const TesourariaSessaoContext = React.createContext<TesourariaSessaoContextValue | undefined>(undefined)

function lerSessaoArmazenada(): string | null {
  const bruto = localStorage.getItem(STORAGE_KEYS.tesourariaSessao)
  if (!bruto) return null
  try {
    const sessao = JSON.parse(bruto) as SessaoTesourariaArmazenada
    if (!sessao.token || sessao.expiresAt < Date.now()) return null
    return sessao.token
  } catch {
    return null
  }
}

export function TesourariaSessaoProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null)
  const [carregando, setCarregando] = React.useState(true)

  React.useEffect(() => {
    setToken(lerSessaoArmazenada())
    setCarregando(false)
  }, [])

  const entrar = React.useCallback(async (senha: string) => {
    const hashEsperado = TESOURARIA_SENHA_HASH || TESOURARIA_SENHA_HASH_PADRAO
    const senhaHash = await sha256Hex(senha)

    if (senhaHash !== hashEsperado) {
      throw new Error('Senha da Tesouraria inválida.')
    }

    const novoToken = crypto.randomUUID()
    const expiresAt = Date.now() + SESSAO_TTL_MS

    localStorage.setItem(STORAGE_KEYS.tesourariaSessao, JSON.stringify({ token: novoToken, expiresAt }))
    setToken(novoToken)
  }, [])

  const sair = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.tesourariaSessao)
    setToken(null)
  }, [])

  const value = React.useMemo(() => ({ token, carregando, entrar, sair }), [token, carregando, entrar, sair])

  return <TesourariaSessaoContext.Provider value={value}>{children}</TesourariaSessaoContext.Provider>
}

export function useTesourariaSessao(): TesourariaSessaoContextValue {
  const context = React.useContext(TesourariaSessaoContext)
  if (!context) throw new Error('useTesourariaSessao deve ser usado dentro de um TesourariaSessaoProvider.')
  return context
}
