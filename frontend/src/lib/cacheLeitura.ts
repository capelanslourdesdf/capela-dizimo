/**
 * Cache com expiração por tempo (TTL) — pensado especificamente pra reduzir leituras repetidas no
 * Firestore quando a mesma pessoa navega entre telas que buscam os mesmos dados em pouco tempo
 * (ex.: Dizimistas -> Lista de devoluções -> Tesouraria, todas lendo a coleção inteira de
 * devoluções). Sem isso, cada troca de tela dispara uma leitura completa de novo, mesmo que os
 * dados não tenham mudado.
 *
 * Também persiste em `localStorage`: sem isso, um F5 ou fechar e reabrir a aba zerava o cache na
 * hora — quem fica o dia inteiro voltando numa tela administrativa que lê uma coleção grande (ex.:
 * Dizimistas) pagava a leitura completa de novo a cada recarregamento, mesmo segundos depois do
 * anterior. Ainda não é um cache "de verdade" (não sincroniza entre pessoas nem entre navegadores
 * diferentes) — só sobrevive a recarregamentos da mesma pessoa, no mesmo navegador.
 *
 * Quem grava sempre invalida a própria chave na hora (ver `invalidarCache`), então isso nunca
 * esconde uma mudança de quem acabou de fazer ela — só atrasa em até `TTL_PADRAO_MS` a visão de
 * uma mudança feita por outra pessoa, em outro navegador.
 */

interface EntradaCache<T> {
  valor: T
  expiraEm: number
}

/** Prefixo de namespace no localStorage, pra não colidir com outras chaves (sessões etc.). */
const PREFIXO_STORAGE = 'cdz:cache:'

const cache = new Map<string, EntradaCache<unknown>>()
/** Promessas em andamento — evita disparar a mesma leitura duas vezes se duas telas pedirem ao mesmo tempo. */
const emAndamento = new Map<string, Promise<unknown>>()

const TTL_PADRAO_MS = 5 * 60_000

function lerDoStorage<T>(chave: string): EntradaCache<T> | null {
  try {
    const bruto = localStorage.getItem(PREFIXO_STORAGE + chave)
    if (!bruto) return null
    const entrada = JSON.parse(bruto) as EntradaCache<T>
    if (!entrada.expiraEm || entrada.expiraEm < Date.now()) return null
    return entrada
  } catch {
    return null
  }
}

function gravarNoStorage<T>(chave: string, entrada: EntradaCache<T>): void {
  try {
    localStorage.setItem(PREFIXO_STORAGE + chave, JSON.stringify(entrada))
  } catch {
    // Armazenamento indisponível ou cheio (ex.: navegação privada) — segue só com o cache em
    // memória, que já cobre a navegação dentro da mesma aba.
  }
}

/**
 * Busca do cache (memória, depois localStorage) se ainda válido; senão chama `buscar()`, guarda o
 * resultado nos dois e devolve. Chamadas concorrentes com a mesma `chave` compartilham a mesma
 * leitura em andamento.
 */
export async function comCache<T>(chave: string, buscar: () => Promise<T>, ttlMs: number = TTL_PADRAO_MS): Promise<T> {
  const cacheado = cache.get(chave)
  if (cacheado && cacheado.expiraEm > Date.now()) {
    return cacheado.valor as T
  }

  const doStorage = lerDoStorage<T>(chave)
  if (doStorage) {
    cache.set(chave, doStorage)
    return doStorage.valor
  }

  const jaEmAndamento = emAndamento.get(chave) as Promise<T> | undefined
  if (jaEmAndamento) return jaEmAndamento

  const promessa = buscar()
    .then((valor) => {
      const entrada = { valor, expiraEm: Date.now() + ttlMs }
      cache.set(chave, entrada)
      gravarNoStorage(chave, entrada)
      return valor
    })
    .finally(() => {
      emAndamento.delete(chave)
    })

  emAndamento.set(chave, promessa)
  return promessa
}

/**
 * Invalida entradas do cache (memória e localStorage) — chamado depois de qualquer escrita, pra
 * garantir que a próxima leitura, na mesma aba, reflita o dado novo em vez de servir algo
 * desatualizado. `prefixo` invalida todas as chaves que começam com ele (ex.: invalidar
 * "devolucoes" limpa "devolucoes" e "devolucoes:2026-08").
 */
export function invalidarCache(prefixo: string): void {
  for (const chave of cache.keys()) {
    if (chave === prefixo || chave.startsWith(`${prefixo}:`)) cache.delete(chave)
  }

  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const chaveStorage = localStorage.key(i)
      if (!chaveStorage || !chaveStorage.startsWith(PREFIXO_STORAGE)) continue
      const chave = chaveStorage.slice(PREFIXO_STORAGE.length)
      if (chave === prefixo || chave.startsWith(`${prefixo}:`)) localStorage.removeItem(chaveStorage)
    }
  } catch {
    // Armazenamento indisponível — o cache em memória já foi limpo, que é o que garante
    // consistência dentro da mesma aba/sessão.
  }
}
