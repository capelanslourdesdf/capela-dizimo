export const ROUTES = {
  home: '/',
  comoFunciona: '/como-funciona',
  recadastramento: '/recadastramento',
  /**
   * Área do dizimista (login + painel) habilitada, mas sem nenhum botão/link visível apontando
   * pra cá em páginas públicas — só é alcançada por quem já tem o link direto. Ver PublicHeader,
   * HomePage etc.
   */
  entrar: '/entrar',
  dizimista: {
    root: '/dizimista',
    cadastro: '/dizimista/cadastro',
    /** Pagamento via Pix real (Mercado Pago) — desativado por enquanto, rota não registrada em App.tsx. */
    pagamento: '/dizimista/pagamento',
    devolucoes: '/dizimista/devolucoes',
    /** Mock de demonstração (QR/código/timer fictícios) — não gera cobrança real. */
    fazerDevolucao: '/dizimista/fazer-devolucao',
  },

  pastoral: {
    entrar: '/pastoral/entrar',
    root: '/pastoral',
    dizimistaDetalhe: (numeroCarne: string) => `/pastoral/dizimistas/${numeroCarne}`,
    recadastramentos: '/pastoral/recadastramentos',
    configuracoes: '/pastoral/configuracoes',
    lancamentoLote: '/pastoral/devolucoes/lote',
    listaDevolucoes: '/pastoral/devolucoes/lista',
    tesouraria: {
      entrar: '/tesouraria/entrar',
      root: '/pastoral/tesouraria',
      eventos: '/pastoral/tesouraria/eventos',
      evolucao: '/pastoral/tesouraria/evolucao',
      controle: (competencia: string) => `/pastoral/tesouraria/${competencia}`,
    },
  },
} as const
