import * as React from 'react'

import { STORAGE_KEYS } from '@/constants/storage'
import { PAPEIS_TESOURARIA, podeEditarTesouraria, type PapelAcesso } from '@/constants/papeisAcesso'
import { hashEsperadoParaPapel } from '@/constants/senhasAcesso'
import { sha256Hex } from '@/utils/hash'

const SESSAO_TTL_MS = 12 * 60 * 60 * 1000

interface SessaoTesourariaArmazenada {
  token: string
  papel: PapelAcesso
  expiresAt: number
}

interface TesourariaSessaoContextValue {
  token: string | null
  papel: PapelAcesso | null
  /** Só o Tesoureiro pode incluir/editar/excluir — os demais perfis só visualizam. */
  podeEditar: boolean
  carregando: boolean
  entrar: (papel: PapelAcesso, senha: string) => Promise<void>
  sair: () => void
}

const TesourariaSessaoContext = React.createContext<TesourariaSessaoContextValue | undefined>(undefined)

function lerSessaoArmazenada(): { token: string; papel: PapelAcesso } | null {
  const bruto = localStorage.getItem(STORAGE_KEYS.tesourariaSessao)
  if (!bruto) return null
  try {
    const sessao = JSON.parse(bruto) as SessaoTesourariaArmazenada
    if (!sessao.token || !sessao.papel || sessao.expiresAt < Date.now()) return null
    return { token: sessao.token, papel: sessao.papel }
  } catch {
    return null
  }
}

export function TesourariaSessaoProvider({ children }: { children: React.ReactNode }) {
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
    if (!PAPEIS_TESOURARIA.includes(papelEscolhido)) {
      throw new Error('Perfil sem acesso à Tesouraria.')
    }

    const hashEsperado = hashEsperadoParaPapel(papelEscolhido)
    const senhaHash = await sha256Hex(senha)

    if (senhaHash !== hashEsperado) {
      throw new Error('Senha inválida para o perfil selecionado.')
    }

    const novoToken = crypto.randomUUID()
    const expiresAt = Date.now() + SESSAO_TTL_MS

    localStorage.setItem(
      STORAGE_KEYS.tesourariaSessao,
      JSON.stringify({ token: novoToken, papel: papelEscolhido, expiresAt }),
    )
    setToken(novoToken)
    setPapel(papelEscolhido)
  }, [])

  const sair = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.tesourariaSessao)
    setToken(null)
    setPapel(null)
  }, [])

  const value = React.useMemo(
    () => ({ token, papel, podeEditar: podeEditarTesouraria(papel), carregando, entrar, sair }),
    [token, papel, carregando, entrar, sair],
  )

  return <TesourariaSessaoContext.Provider value={value}>{children}</TesourariaSessaoContext.Provider>
}

export function useTesourariaSessao(): TesourariaSessaoContextValue {
  const context = React.useContext(TesourariaSessaoContext)
  if (!context) throw new Error('useTesourariaSessao deve ser usado dentro de um TesourariaSessaoProvider.')
  return context
}
