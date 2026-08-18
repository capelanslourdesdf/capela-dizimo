export const ROUTES = {
  home: '/',
  /** Página do Dízimo: acessos do dizimista e da Pastoral. */
  dizimo: '/dizimo',
  comoFunciona: '/como-funciona',
  recadastramento: '/recadastramento',
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
    membros: '/pastoral/membros',
    lancamentoLote: '/pastoral/devolucoes/lote',
  },
} as const
