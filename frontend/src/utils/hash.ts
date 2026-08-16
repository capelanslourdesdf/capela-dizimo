/**
 * SHA-256 via Web Crypto API (nativa do navegador, sem dependências).
 * Usada para comparar a senha da Pastoral sem manter o valor em texto puro no código.
 */
export async function sha256Hex(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
