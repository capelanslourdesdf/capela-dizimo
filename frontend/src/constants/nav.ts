import { ArrowLeftRight, ClipboardList, Home, IdCard, Layers, UserCog, Users, type LucideIcon } from 'lucide-react'

import { ROUTES } from '@/constants/routes'

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
]

export const dizimistaMobileNav: NavItem[] = dizimistaNav

export const pastoralNav: NavItem[] = [
  { label: 'Dizimistas', href: ROUTES.pastoral.root, icon: Users, end: true },
  { label: 'Recadastramentos', href: ROUTES.pastoral.recadastramentos, icon: ClipboardList },
  { label: 'Lançar devoluções em lote', href: ROUTES.pastoral.lancamentoLote, icon: Layers },
  { label: 'Membros da Pastoral', href: ROUTES.pastoral.membros, icon: UserCog },
]
