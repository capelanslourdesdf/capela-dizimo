import * as React from 'react'

import type { Dizimista } from '@/types'
import { buscarDizimistaPorCarne } from '@/services/dizimistaService'
import { STORAGE_KEYS } from '@/constants/storage'
import { isoParaDiaMes } from '@/utils/format'

const SESSAO_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias

interface SessaoArmazenada {
  numeroCarne: string
  expiraEm: number
}

interface DizimistaSessaoContextValue {
  numeroCarne: string | null
  dizimista: Dizimista | null
  carregando: boolean
  entrar: (numeroCarne: string, diaMesNascimento: string) => Promise<Dizimista>
  sair: () => void
  recarregar: () => Promise<void>
}

const DizimistaSessaoContext = React.createContext<DizimistaSessaoContextValue | undefined>(undefined)

function diaMesDe(dataNascimento?: string, diaMesNascimento?: string): string {
  return diaMesNascimento?.trim() || isoParaDiaMes(dataNascimento || '')
}

/**
 * Dias/meses aceitos no login deste carnê. Registros importados da planilha antiga não têm o ano,
 * então guardam `diaMesNascimento`; os demais derivam da data completa.
 *
 * Um mesmo carnê pertence à família: na planilha de origem o cônjuge (e às vezes filhos) aparecem
 * no mesmo número. Por isso qualquer membro pode entrar usando o próprio dia/mês.
 */
function diasMesesDo(dizimista: Dizimista): string[] {
  const membros = [
    diaMesDe(dizimista.dataNascimento, dizimista.diaMesNascimento),
    diaMesDe(dizimista.conjuge?.dataNascimento, dizimista.conjuge?.diaMesNascimento),
    ...(dizimista.filhos ?? []).map((f) => diaMesDe(f.dataNascimento, f.diaMesNascimento)),
  ]
  return membros.filter(Boolean)
}

function lerSessaoArmazenada(): string | null {
  const bruto = localStorage.getItem(STORAGE_KEYS.dizimistaSessao)
  if (!bruto) return null
  try {
    const sessao = JSON.parse(bruto) as SessaoArmazenada
    if (!sessao.numeroCarne || sessao.expiraEm < Date.now()) return null
    return sessao.numeroCarne
  } catch {
    return null
  }
}

function persistirSessao(numeroCarne: string) {
  const sessao: SessaoArmazenada = { numeroCarne, expiraEm: Date.now() + SESSAO_TTL_MS }
  localStorage.setItem(STORAGE_KEYS.dizimistaSessao, JSON.stringify(sessao))
}

export function DizimistaSessaoProvider({ children }: { children: React.ReactNode }) {
  const [numeroCarne, setNumeroCarne] = React.useState<string | null>(null)
  const [dizimista, setDizimista] = React.useState<Dizimista | null>(null)
  const [carregando, setCarregando] = React.useState(true)

  const carregarPerfil = React.useCallback(async (carne: string) => {
    const encontrado = await buscarDizimistaPorCarne(carne)
    setDizimista(encontrado)
    return encontrado
  }, [])

  React.useEffect(() => {
    const carneArmazenado = lerSessaoArmazenada()
    if (!carneArmazenado) {
      setCarregando(false)
      return
    }

    setNumeroCarne(carneArmazenado)
    carregarPerfil(carneArmazenado).finally(() => setCarregando(false))
  }, [carregarPerfil])

  const entrar = React.useCallback(
    async (carneInformado: string, diaMesInformado: string) => {
      const carne = carneInformado.trim()
      const encontrado = await buscarDizimistaPorCarne(carne)

      if (!encontrado || !diasMesesDo(encontrado).includes(diaMesInformado.trim())) {
        throw new Error('Nº do carnê ou dia/mês de nascimento não conferem.')
      }

      persistirSessao(carne)
      setNumeroCarne(carne)
      setDizimista(encontrado)
      return encontrado
    },
    [],
  )

  const sair = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.dizimistaSessao)
    setNumeroCarne(null)
    setDizimista(null)
  }, [])

  const recarregar = React.useCallback(async () => {
    if (!numeroCarne) return
    await carregarPerfil(numeroCarne)
  }, [numeroCarne, carregarPerfil])

  const value = React.useMemo(
    () => ({ numeroCarne, dizimista, carregando, entrar, sair, recarregar }),
    [numeroCarne, dizimista, carregando, entrar, sair, recarregar],
  )

  return <DizimistaSessaoContext.Provider value={value}>{children}</DizimistaSessaoContext.Provider>
}

export function useDizimistaSessao(): DizimistaSessaoContextValue {
  const context = React.useContext(DizimistaSessaoContext)
  if (!context) throw new Error('useDizimistaSessao deve ser usado dentro de um DizimistaSessaoProvider.')
  return context
}
