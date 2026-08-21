/**
 * Cache simples em memória, com expiração por tempo (TTL) — pensado especificamente pra reduzir
 * leituras repetidas no Firestore quando a mesma pessoa navega entre telas que buscam os mesmos
 * dados em pouco tempo (ex.: Dizimistas -> Lista de devoluções -> Tesouraria, todas lendo a
 * coleção inteira de devoluções). Sem isso, cada troca de tela dispara uma leitura completa de
 * novo, mesmo que os dados não tenham mudado.
 *
 * Não é um cache "de verdade" (não persiste entre abas/recarregamentos, não sincroniza entre
 * usuários) — é só uma forma barata de evitar leituras redundantes dentro da mesma sessão.
 */

interface EntradaCache<T> {
  valor: T
  expiraEm: number
}

const cache = new Map<string, EntradaCache<unknown>>()
/** Promessas em andamento — evita disparar a mesma leitura duas vezes se duas telas pedirem ao mesmo tempo. */
const emAndamento = new Map<string, Promise<unknown>>()

const TTL_PADRAO_MS = 60_000

/**
 * Busca do cache se ainda válido; senão chama `buscar()`, guarda o resultado e devolve. Chamadas
 * concorrentes com a mesma `chave` compartilham a mesma leitura em andamento.
 */
export async function comCache<T>(chave: string, buscar: () => Promise<T>, ttlMs: number = TTL_PADRAO_MS): Promise<T> {
  const cacheado = cache.get(chave)
  if (cacheado && cacheado.expiraEm > Date.now()) {
    return cacheado.valor as T
  }

  const jaEmAndamento = emAndamento.get(chave) as Promise<T> | undefined
  if (jaEmAndamento) return jaEmAndamento

  const promessa = buscar()
    .then((valor) => {
      cache.set(chave, { valor, expiraEm: Date.now() + ttlMs })
      return valor
    })
    .finally(() => {
      emAndamento.delete(chave)
    })

  emAndamento.set(chave, promessa)
  return promessa
}

/**
 * Invalida entradas do cache — chamado depois de qualquer escrita, pra garantir que a próxima
 * leitura reflita o dado novo em vez de servir algo desatualizado. `prefixo` invalida todas as
 * chaves que começam com ele (ex.: invalidar "devolucoes" limpa "devolucoes" e "devolucoes:2026-08").
 */
export function invalidarCache(prefixo: string): void {
  for (const chave of cache.keys()) {
    if (chave === prefixo || chave.startsWith(`${prefixo}:`)) cache.delete(chave)
  }
}
