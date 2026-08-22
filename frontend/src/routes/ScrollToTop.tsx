import * as React from 'react'
import { useLocation } from 'react-router-dom'

/**
 * O React Router não reseta a rolagem ao trocar de rota (diferente de navegação tradicional de
 * página) — sem isso, quem loga vindo de uma tela rolada pra baixo cai na próxima já rolado,
 * escondendo o começo da página atrás do topo fixo. Duas coisas são necessárias, não só o
 * `scrollTo`:
 *
 * 1. Desligar a restauração automática de rolagem do navegador (`history.scrollRestoration`).
 *    Em mobile, o navegador tenta "ajudar" restaurando a posição rolada anterior ao carregar a
 *    página (recarregar, voltar/avançar) — e isso roda de forma assíncrona, podendo vencer o
 *    `scrollTo` abaixo se acontecer depois dele. Sem isso, o topo do carnê aparece corretamente
 *    por um instante e depois "pula" pra baixo, escondido atrás do cabeçalho fixo.
 * 2. Rodar o reset em `useLayoutEffect` (síncrono, antes da pintura da tela) em vez de
 *    `useEffect` (assíncrono, depois da pintura) — evita que a pessoa chegue a ver, mesmo que só
 *    por um instante, a tela nova já carregada na posição errada.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  React.useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  React.useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
