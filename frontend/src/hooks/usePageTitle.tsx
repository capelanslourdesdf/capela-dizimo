import * as React from 'react'

interface PageTitleContextValue {
  titulo: string
  definirTitulo: (titulo: string) => void
}

const PageTitleContext = React.createContext<PageTitleContextValue | undefined>(undefined)

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [titulo, setTitulo] = React.useState('')
  const value = React.useMemo(() => ({ titulo, definirTitulo: setTitulo }), [titulo])
  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>
}

function usePageTitleContext(): PageTitleContextValue {
  const context = React.useContext(PageTitleContext)
  if (!context) throw new Error('usePageTitle deve ser usado dentro de um PageTitleProvider.')
  return context
}

/** Lê o título da tela atual, exibido no topo no mobile (ver AppTopbar). */
export function usePageTitle(): string {
  return usePageTitleContext().titulo
}

/** Registra o título da tela atual — chamado pelo PageHeader; use direto só quando a tela não tem um. */
export function useDefinirPageTitle(titulo: string) {
  const { definirTitulo } = usePageTitleContext()
  React.useLayoutEffect(() => {
    definirTitulo(titulo)
  }, [titulo, definirTitulo])
}
