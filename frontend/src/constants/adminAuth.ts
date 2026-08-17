/**
 * Login fixo da Pastoral, configurado por variáveis de ambiente e verificado no navegador.
 *
 * ATENÇÃO: variáveis `VITE_*` são embutidas no bundle e ficam legíveis por qualquer visitante —
 * elas servem para configurar o acesso sem editar código, não para guardar segredo. Por isso o
 * caminho recomendado é informar o HASH da senha (`VITE_ADMIN_SENHA_HASH`), e não a senha em si.
 *
 * Isso é coerente com o restante do projeto nesta fase: as regras do Firestore já são abertas
 * (allow read, write: if true), então este login funciona como uma trava de UX para a equipe da
 * Pastoral, não como um limite de segurança rígido.
 *
 * Para gerar o hash de uma senha nova:
 *   npm run gerar:hash-senha -- "sua-senha"
 */

/** SHA-256 de "#CNSLourdes2026" — usado quando nenhuma variável de ambiente é informada. */
const SENHA_HASH_PADRAO = '596b0fa5bac38dc52ee89f0253da1400ceeeeeb8d05f104bd107eef8c1eb7b23'

export const ADMIN_USUARIO = import.meta.env.VITE_ADMIN_USUARIO?.trim() || 'dizimo'

/** Hash esperado da senha, quando configurado diretamente (opção recomendada). */
export const ADMIN_SENHA_HASH = import.meta.env.VITE_ADMIN_SENHA_HASH?.trim() || ''

/**
 * Senha em texto puro — alternativa mais simples de configurar, porém visível no bundle.
 * Só é usada quando `VITE_ADMIN_SENHA_HASH` não está definida.
 */
export const ADMIN_SENHA_TEXTO = import.meta.env.VITE_ADMIN_SENHA?.trim() || ''

/** Fallback usado quando nenhuma das duas variáveis acima foi configurada. */
export const ADMIN_SENHA_HASH_PADRAO = SENHA_HASH_PADRAO
