/**
 * Senha extra para entrar na área da Tesouraria, dentro da área da Pastoral. Mesmo racional de
 * `constants/adminAuth.ts`: variáveis `VITE_*` são embutidas no bundle (não são segredo forte),
 * então a única opção aqui é o HASH da senha (`VITE_TESOURARIA_SENHA_HASH`) — sem alternativa em
 * texto puro, para não deixar a senha legível no bundle.
 *
 * Para gerar o hash de uma senha nova:
 *   npm run gerar:hash-senha -- "sua-senha"
 */

/** SHA-256 de "#Tesouraria2026" — usado quando nenhuma variável de ambiente é informada. */
const SENHA_HASH_PADRAO = 'ea74e2425a0c1365754c4476b0415a9e7e83cae0ffd29d5a9f647d663e6a4ceb'

/** Hash esperado da senha. */
export const TESOURARIA_SENHA_HASH = import.meta.env.VITE_TESOURARIA_SENHA_HASH?.trim() || ''

/** Fallback usado quando a variável acima não foi configurada. */
export const TESOURARIA_SENHA_HASH_PADRAO = SENHA_HASH_PADRAO
