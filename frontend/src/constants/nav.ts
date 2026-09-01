import {
  ArrowLeftRight,
  ClipboardList,
  Home,
  IdCard,
  Landmark,
  LayoutDashboard,
  Layers,
  PartyPopper,
  Plus,
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
  { label: 'Devolver meu dízimo', href: ROUTES.dizimista.fazerDevolucao, icon: QrCode },
  { label: 'Minhas devoluções', href: ROUTES.dizimista.devolucoes, icon: ArrowLeftRight },
  { label: 'Atualização cadastral', href: ROUTES.dizimista.cadastro, icon: IdCard },
]

export const pastoralNav: NavItem[] = [
  { label: 'Dizimistas', href: ROUTES.pastoral.root, icon: Users, end: true },
  { label: 'Lançar devolução', href: ROUTES.pastoral.lancamentoUnico, icon: Plus },
  { label: 'Lançar devoluções em lote', href: ROUTES.pastoral.lancamentoLote, icon: Layers },
  { label: 'Lista de devoluções', href: ROUTES.pastoral.listaDevolucoes, icon: ArrowLeftRight },
  { label: 'Recadastramentos', href: ROUTES.pastoral.recadastramentos, icon: ClipboardList },
  { label: 'Tesouraria', href: ROUTES.pastoral.tesouraria.root, icon: Landmark },
  { label: 'Configurações', href: ROUTES.pastoral.configuracoes, icon: Settings },
]

/**
 * O que cada papel enxerga no menu da área da Pastoral — lista explícita (não é "tudo menos X"),
 * já que cada papel tem um recorte bem diferente:
 * - Tesoureiro: tudo.
 * - Pastoral do Dízimo: só o dia a dia de dizimistas/devoluções, nada de Tesouraria/Recadastramentos/Configurações.
 * - Coordenadora: só acompanha Dizimistas e Tesouraria — "Tesouraria" aqui é o mesmo item de sempre,
 *   que leva pro login dela (decoupled, ver useTesourariaSessao) caso ainda não esteja logada lá.
 * "Tesouraria" leva pra fora desta área (rota própria, sessão própria) — por isso não conta como
 * algo que a Pastoral do Dízimo "usa": ela nem tem acesso a esse login separado.
 */
const ITENS_POR_PAPEL: Record<PapelAcesso, 'todos' | string[]> = {
  tesoureiro: 'todos',
  pastoral_dizimo: [ROUTES.pastoral.root, ROUTES.pastoral.lancamentoUnico, ROUTES.pastoral.lancamentoLote],
  coordenadora: [ROUTES.pastoral.root, ROUTES.pastoral.tesouraria.root],
  // Não é um papel da área da Pastoral (só de Tesouraria) — por segurança, não mostra nada aqui.
  secretaria_paroquial: [],
}

export function pastoralNavParaPapel(papel: PapelAcesso | null): NavItem[] {
  if (!papel) return []
  const permitidos = ITENS_POR_PAPEL[papel]
  if (permitidos === 'todos') return pastoralNav
  return pastoralNav.filter((item) => permitidos.includes(item.href))
}

export const tesourariaNav: NavItem[] = [
  { label: 'Painel', href: ROUTES.pastoral.tesouraria.root, icon: LayoutDashboard, end: true },
  { label: 'Evolução', href: ROUTES.pastoral.tesouraria.evolucao, icon: TrendingUp },
  { label: 'Eventos', href: ROUTES.pastoral.tesouraria.eventos, icon: PartyPopper },
]
