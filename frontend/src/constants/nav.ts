import {
  ArrowLeftRight,
  ClipboardList,
  Home,
  IdCard,
  Landmark,
  LayoutDashboard,
  Layers,
  PartyPopper,
  QrCode,
  Settings,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { ROUTES } from '@/constants/routes'
import type { PapelAcesso } from '@/constants/papeisAcesso'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  end?: boolean
}

export const dizimistaNav: NavItem[] = [
  { label: 'Início', href: ROUTES.dizimista.root, icon: Home, end: true },
  { label: 'Atualização cadastral', href: ROUTES.dizimista.cadastro, icon: IdCard },
  { label: 'Minhas devoluções', href: ROUTES.dizimista.devolucoes, icon: ArrowLeftRight },
  { label: 'Fazer devolução', href: ROUTES.dizimista.fazerDevolucao, icon: QrCode },
]

/**
 * Menu inferior do mobile: ícone e rótulo ficam na mesma linha, então os textos precisam ser
 * curtos o bastante para caber em uma coluna estreita.
 */
export const dizimistaMobileNav: NavItem[] = [
  { label: 'Início', href: ROUTES.dizimista.root, icon: Home, end: true },
  { label: 'Cadastro', href: ROUTES.dizimista.cadastro, icon: IdCard },
  { label: 'Devoluções', href: ROUTES.dizimista.devolucoes, icon: ArrowLeftRight },
  { label: 'Devolver', href: ROUTES.dizimista.fazerDevolucao, icon: QrCode },
]

export const pastoralNav: NavItem[] = [
  { label: 'Dizimistas', href: ROUTES.pastoral.root, icon: Users, end: true },
  { label: 'Recadastramentos', href: ROUTES.pastoral.recadastramentos, icon: ClipboardList },
  { label: 'Lançar devoluções em lote', href: ROUTES.pastoral.lancamentoLote, icon: Layers },
  { label: 'Lista de devoluções', href: ROUTES.pastoral.listaDevolucoes, icon: ArrowLeftRight },
  { label: 'Tesouraria', href: ROUTES.pastoral.tesouraria.root, icon: Landmark },
  { label: 'Configurações', href: ROUTES.pastoral.configuracoes, icon: Settings },
]

/** A "Pastoral do Dízimo" não enxerga Configurações nem Tesouraria — os outros dois perfis veem o menu todo. */
export function pastoralNavParaPapel(papel: PapelAcesso | null): NavItem[] {
  if (papel !== 'pastoral_dizimo') return pastoralNav
  return pastoralNav.filter(
    (item) => item.href !== ROUTES.pastoral.configuracoes && item.href !== ROUTES.pastoral.tesouraria.root,
  )
}

export const tesourariaNav: NavItem[] = [
  { label: 'Painel', href: ROUTES.pastoral.tesouraria.root, icon: LayoutDashboard, end: true },
  { label: 'Evolução', href: ROUTES.pastoral.tesouraria.evolucao, icon: TrendingUp },
  { label: 'Eventos', href: ROUTES.pastoral.tesouraria.eventos, icon: PartyPopper },
]
