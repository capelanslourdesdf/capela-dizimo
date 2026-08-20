export const ROUTES = {
  home: '/',
  comoFunciona: '/como-funciona',
  recadastramento: '/recadastramento',
  /**
   * Área do dizimista (login + dashboard) desativada por enquanto — nenhuma dessas rotas está
   * registrada em App.tsx, só o recadastramento fica acessível ao público. Motivo: nº do carnê +
   * dia/mês de nascimento é um login fraco (fácil de adivinhar/compartilhar), então até
   * incrementarmos essa segurança, evitamos que alguém use dados de um recadastramento para abrir
   * o dízimo de outra pessoa. Reative aqui e em App.tsx quando for pedido para voltar.
   */
  entrar: '/entrar',
  dizimista: {
    root: '/dizimista',
    cadastro: '/dizimista/cadastro',
    /** Pagamento via Pix — desativado por enquanto, rota não registrada em App.tsx. */
    pagamento: '/dizimista/pagamento',
    devolucoes: '/dizimista/devolucoes',
  },

  pastoral: {
    entrar: '/pastoral/entrar',
    root: '/pastoral',
    dizimistaDetalhe: (numeroCarne: string) => `/pastoral/dizimistas/${numeroCarne}`,
    recadastramentos: '/pastoral/recadastramentos',
    configuracoes: '/pastoral/configuracoes',
    lancamentoLote: '/pastoral/devolucoes/lote',
    tesouraria: {
      entrar: '/pastoral/tesouraria/entrar',
      root: '/pastoral/tesouraria',
      eventos: '/pastoral/tesouraria/eventos',
      evolucao: '/pastoral/tesouraria/evolucao',
      controle: (competencia: string) => `/pastoral/tesouraria/${competencia}`,
    },
  },
} as const
