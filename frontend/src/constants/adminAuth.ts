/**
 * Login fixo da Pastoral, verificado inteiramente no navegador (sem variáveis de ambiente
 * nem chamada ao backend). A senha não fica em texto puro no código-fonte — apenas seu hash
 * SHA-256 é comparado com o hash do que a pessoa digitar.
 *
 * Isso é coerente com o restante do projeto nesta fase: as regras do Firestore já são abertas
 * (allow read, write: if true), então este login funciona como uma trava de UX para a equipe da
 * Pastoral, não como um limite de segurança rígido.
 */
export const ADMIN_USUARIO = 'dizimo'

// SHA-256 de "#CNSLourdes2026"
export const ADMIN_SENHA_HASH = '596b0fa5bac38dc52ee89f0253da1400ceeeeeb8d05f104bd107eef8c1eb7b23'
