/**
 * Garante que, a partir de `inicio` (timestamp de `Date.now()`), passem pelo menos `minimoMs`
 * antes de resolver. Usado em indicadores de carregamento (CEP, busca de carnê etc.) cuja
 * resposta às vezes chega tão rápido que o spinner pisca por poucos milissegundos e parece
 * travado/estático em vez de girar — um mínimo perceptível resolve isso sem atrasar de verdade
 * respostas que já demoram mais que o mínimo.
 */
export function aguardarPeloMenos(inicio: number, minimoMs: number): Promise<void> {
  const restante = minimoMs - (Date.now() - inicio)
  return restante > 0 ? new Promise((resolve) => setTimeout(resolve, restante)) : Promise.resolve()
}
