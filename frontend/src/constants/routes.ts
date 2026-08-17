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
    pagamento: '/dizimista/pagamento',
    pagamentos: '/dizimista/pagamentos',
  },

  pastoral: {
    entrar: '/pastoral/entrar',
    root: '/pastoral',
    dizimistaDetalhe: (numeroCarne: string) => `/pastoral/dizimistas/${numeroCarne}`,
    recadastramentos: '/pastoral/recadastramentos',
    membros: '/pastoral/membros',
  },
} as const
