import { ClipboardList, Home, IdCard, QrCode, Receipt, UserCog, Users, type LucideIcon } from 'lucide-react'

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
  { label: 'Pagar com Pix', href: ROUTES.dizimista.pagamento, icon: QrCode },
  { label: 'Meus pagamentos', href: ROUTES.dizimista.pagamentos, icon: Receipt },
]

export const dizimistaMobileNav: NavItem[] = dizimistaNav

export const pastoralNav: NavItem[] = [
  { label: 'Dizimistas', href: ROUTES.pastoral.root, icon: Users, end: true },
  { label: 'Recadastramentos', href: ROUTES.pastoral.recadastramentos, icon: ClipboardList },
  { label: 'Membros da Pastoral', href: ROUTES.pastoral.membros, icon: UserCog },
]
