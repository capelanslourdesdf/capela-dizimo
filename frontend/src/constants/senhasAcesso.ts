import type { PapelAcesso } from '@/constants/papeisAcesso'

/**
 * Uma senha por perfil, verificada no navegador — mesmo racional do restante do projeto: variáveis
 * `VITE_*` são embutidas no bundle e ficam legíveis por qualquer visitante, então o caminho
 * recomendado é configurar o HASH da senha (não a senha em texto puro). Coordenadora e Tesoureiro
 * usam a mesma senha no login da Pastoral e no login da Tesouraria (é a mesma pessoa entrando em
 * dois portões diferentes); Pastoral do Dízimo e Secretaria Paroquial só existem num dos dois.
 *
 * Senhas em CAIXA ALTA — o campo de senha já converte tudo pra maiúsculo enquanto a pessoa digita
 * (ver AdminLoginForm/TesourariaLoginForm), então o hash aqui também precisa ser da versão maiúscula.
 *
 * Para gerar o hash de uma senha nova:
 *   npm run gerar:hash-senha -- "SUA-SENHA"
 */

/** Hash padrão de cada perfil, usado quando a variável de ambiente correspondente não está definida. */
const HASH_PADRAO: Record<PapelAcesso, string> = {
  // SHA-256 de "#DIZIMO26"
  pastoral_dizimo: '0255b78ca2096d182cfcb8919da2139280bb25f78ca805ccdb089d64ecf16d14',
  // SHA-256 de "#LOURDES26"
  coordenadora: '05cc3901de09e94c20c650fb801747f7b803e11e628db1d1e3c83662c1730f5d',
  // SHA-256 de "#TESOURO26"
  tesoureiro: 'b765696bb95602df5df8a5bddf0956e468124f4bdcdec1964a2de59f03742e66',
  // SHA-256 de "#PAROQUIA26"
  secretaria_paroquial: 'd5452b10ac41076a19ea75c3f24e82baed0098e2c164b990212408868b0b8269',
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
