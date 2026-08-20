import type { CategoriaEntradaTesouraria, StatusControleTesouraria } from '@/types'

export const CATEGORIAS_ENTRADA_TESOURARIA: { value: CategoriaEntradaTesouraria; label: string }[] = [
  { value: 'dizimo', label: 'Dízimo' },
  { value: 'oferta', label: 'Oferta' },
  { value: 'bazar', label: 'Bazar' },
  { value: 'lojinha', label: 'Lojinha' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'acao_solidaria', label: 'Ação solidária' },
  { value: 'doacoes', label: 'Doações' },
]

/** Aceita `string` porque a categoria vem de dados salvos, que podem ficar defasados da lista atual. */
export function categoriaEntradaLabel(categoria: string): string {
  return CATEGORIAS_ENTRADA_TESOURARIA.find((c) => c.value === categoria)?.label ?? categoria
}

export const STATUS_CONTROLE_TESOURARIA: Record<StatusControleTesouraria, string> = {
  em_andamento: 'Em andamento',
  fechado: 'Fechado',
}

/** Competência ("aaaa-mm") a partir da qual a Tesouraria passa a controlar dados no site — meses anteriores ficam de fora. */
export const COMPETENCIA_INICIAL_TESOURARIA = '2026-08'

/** Ano a partir do qual a visão de eventos da Tesouraria começa. */
export const ANO_INICIAL_EVENTOS_TESOURARIA = 2026

/**
 * Portal Nacional da NF-e — consulta pública oficial. Não dá pra confiar num parâmetro de URL
 * pra pré-preencher a chave de acesso (o site normalmente exige digitá-la manualmente após um
 * captcha), então o botão que usa este link também copia a chave pra área de transferência, pra
 * colar rápido assim que a página abrir.
 */
export const URL_CONSULTA_NFE = 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g='
