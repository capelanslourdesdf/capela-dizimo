import * as React from 'react'
import { useLocation } from 'react-router-dom'

/**
 * O React Router não reseta a rolagem ao trocar de rota (diferente de navegação tradicional de
 * página) — sem isso, quem loga vindo de uma tela rolada pra baixo cai na próxima já rolado,
 * escondendo o começo da página atrás do topo fixo.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  React.useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
