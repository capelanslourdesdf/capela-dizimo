import type { PapelAcesso } from '@/constants/papeisAcesso'

/**
 * Uma senha por perfil, verificada no navegador — mesmo racional do restante do projeto: variáveis
 * `VITE_*` são embutidas no bundle e ficam legíveis por qualquer visitante, então o caminho
 * recomendado é configurar o HASH da senha (não a senha em texto puro). Coordenadora e Tesoureiro
 * usam a mesma senha no login da Pastoral e no login da Tesouraria (é a mesma pessoa entrando em
 * dois portões diferentes); Pastoral do Dízimo e Secretaria Paroquial só existem num dos dois.
 *
 * Para gerar o hash de uma senha nova:
 *   npm run gerar:hash-senha -- "sua-senha"
 */

/** Hash padrão de cada perfil, usado quando a variável de ambiente correspondente não está definida. */
const HASH_PADRAO: Record<PapelAcesso, string> = {
  // SHA-256 de "#Dizimo26"
  pastoral_dizimo: '57adf42f1cbef9042c193000506f29fceee56828465f23b451287532e579ac06',
  // SHA-256 de "#Lourdes26"
  coordenadora: '18f5fbc0af375f46d75743f7fda884fe16effed73372bfc101a1e998b9c05221',
  // SHA-256 de "#Tesouro26"
  tesoureiro: '64eeae9a43ad0d6fc092420a08ee60864beecdf4251df3fb8c0d8f06ab532f72',
  // SHA-256 de "#Paroquia26"
  secretaria_paroquial: 'a3b53782d17f57e713690198a838a1cb12168a12274f66994cc486d58a69ba2a',
}

const ENV_HASH: Record<PapelAcesso, string | undefined> = {
  pastoral_dizimo: import.meta.env.VITE_SENHA_PASTORAL_DIZIMO_HASH,
  coordenadora: import.meta.env.VITE_SENHA_COORDENADORA_HASH,
  tesoureiro: import.meta.env.VITE_SENHA_TESOUREIRO_HASH,
  secretaria_paroquial: import.meta.env.VITE_SENHA_SECRETARIA_PAROQUIAL_HASH,
}

export function hashEsperadoParaPapel(papel: PapelAcesso): string {
  return ENV_HASH[papel]?.trim() || HASH_PADRAO[papel]
}
