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

/** A "Pastoral do Dízimo" não enxerga Configurações nem a Tesouraria — os outros dois perfis veem tudo. */
export function podeAcessarConfiguracoesETesouraria(papel: PapelAcesso | null): boolean {
  return papel !== 'pastoral_dizimo'
}
