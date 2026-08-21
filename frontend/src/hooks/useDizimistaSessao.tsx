import * as React from 'react'

import type { Dizimista } from '@/types'
import { buscarDizimistaPorCarne } from '@/services/dizimistaService'
import { STORAGE_KEYS } from '@/constants/storage'
import { dataBrParaIso } from '@/utils/format'

const SESSAO_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias

interface SessaoArmazenada {
  numeroCarne: string
  expiraEm: number
}

interface DizimistaSessaoContextValue {
  numeroCarne: string | null
  dizimista: Dizimista | null
  carregando: boolean
  entrar: (numeroCarne: string, dataNascimentoBr: string) => Promise<Dizimista>
  sair: () => void
  recarregar: () => Promise<void>
}

const DizimistaSessaoContext = React.createContext<DizimistaSessaoContextValue | undefined>(undefined)

/**
 * Datas de nascimento ("aaaa-mm-dd") aceitas no login deste carnê. Só a data completa vale — não
 * basta dia/mês, diferente da busca de carnê esquecido (ver `diaMesDoRegistro`/`buscarCarnePorNomeENascimento`
 * em dizimistaService). Registros importados da planilha antiga sem ano completo (`dataNascimento`
 * vazia) simplesmente não conseguem entrar por aqui.
 *
 * Um mesmo carnê pertence à família: na planilha de origem o cônjuge (e às vezes filhos) aparecem
 * no mesmo número. Por isso qualquer membro pode entrar usando a própria data.
 */
function datasNascimentoDo(dizimista: Dizimista): string[] {
  const membros = [
    dizimista.dataNascimento,
    dizimista.conjuge?.dataNascimento,
    ...(dizimista.filhos ?? []).map((f) => f.dataNascimento),
  ]
  return membros.filter((data): data is string => !!data)
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
    async (carneInformado: string, dataNascimentoBr: string) => {
      const dataIso = dataBrParaIso(dataNascimentoBr.trim())
      // Busca já aceita o carnê digitado com ou sem zeros à esquerda (ex.: "001" para o carnê
      // "1") — usa sempre o id real devolvido (`encontrado.numeroCarne`) daqui pra frente, nunca
      // o que foi digitado, senão a sessão e as leituras seguintes ficariam com uma chave errada.
      const encontrado = await buscarDizimistaPorCarne(carneInformado)

      if (!encontrado || !dataIso || !datasNascimentoDo(encontrado).includes(dataIso)) {
        throw new Error('Nº do carnê ou data de nascimento não conferem.')
      }

      persistirSessao(encontrado.numeroCarne)
      setNumeroCarne(encontrado.numeroCarne)
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
