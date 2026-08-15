export const ROUTES = {
  home: '/',
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
  },
} as const
