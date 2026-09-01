import { ROUTES } from '@/constants/routes'

export type PapelAcesso = 'pastoral_dizimo' | 'coordenadora' | 'tesoureiro' | 'secretaria_paroquial'

export const PAPEL_LABEL: Record<PapelAcesso, string> = {
  pastoral_dizimo: 'Pastoral do Dízimo',
  coordenadora: 'Coordenadora',
  tesoureiro: 'Tesoureiro',
  secretaria_paroquial: 'Secretaria Paroquial',
}

/** Perfis que aparecem no login da área da Pastoral. */
export const PAPEIS_PASTORAL: PapelAcesso[] = ['pastoral_dizimo', 'coordenadora', 'tesoureiro']

/**
 * Perfis que aparecem no login da Tesouraria — um segundo portão, dentro da Pastoral. Coordenadora
 * e Tesoureiro usam a mesma senha nos dois logins (é a mesma pessoa); Secretaria Paroquial só
 * existe aqui, e Pastoral do Dízimo não tem acesso nenhum à Tesouraria.
 */
export const PAPEIS_TESOURARIA: PapelAcesso[] = ['coordenadora', 'secretaria_paroquial', 'tesoureiro']

/** Só o Tesoureiro inclui, edita ou exclui dentro da Tesouraria — os demais perfis só visualizam. */
export function podeEditarTesouraria(papel: PapelAcesso | null): boolean {
  return papel === 'tesoureiro'
}

/** Na área da Pastoral, só Coordenadora e Tesoureiro veem o total arrecadado em dízimo no ano (cards e o card "Total arrecadado por ano" em Dizimistas) — a Pastoral do Dízimo não enxerga esses valores. */
export function podeVerTotalArrecadado(papel: PapelAcesso | null): boolean {
  return papel === 'coordenadora' || papel === 'tesoureiro'
}

/** Rotas da área da Pastoral que a "Pastoral do Dízimo" pode usar — só o dia a dia de dizimistas/devoluções. */
const ROTAS_PASTORAL_DIZIMO: string[] = [ROUTES.pastoral.root, ROUTES.pastoral.lancamentoUnico, ROUTES.pastoral.lancamentoLote]

/** Rotas da área da Pastoral que a Coordenadora pode usar — só acompanha a lista de Dizimistas (Tesouraria é login/rota à parte). */
const ROTAS_COORDENADORA: string[] = [ROUTES.pastoral.root]

/**
 * Confere se o papel pode acessar a rota `pathname` dentro da área da Pastoral — bloqueia
 * navegação direta por URL, não só esconde o item do menu (ver `pastoralNavParaPapel`, em
 * constants/nav.ts, que cobre a mesma regra pro menu, com a mesma lista de rotas por papel).
 *
 * A ficha de um dizimista (`/pastoral/dizimistas/:numeroCarne`) conta como parte de "Dizimistas":
 * quem pode ver a lista também pode abrir uma ficha, mesmo sem ela aparecer como item próprio do
 * menu.
 */
export function podeAcessarRotaPastoral(papel: PapelAcesso | null, pathname: string): boolean {
  if (papel === 'tesoureiro') return true
  if (pathname.startsWith('/pastoral/dizimistas/')) {
    return papel === 'pastoral_dizimo' || papel === 'coordenadora'
  }
  if (papel === 'pastoral_dizimo') return ROTAS_PASTORAL_DIZIMO.includes(pathname)
  if (papel === 'coordenadora') return ROTAS_COORDENADORA.includes(pathname)
  return false
}
