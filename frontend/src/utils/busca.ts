/**
 * Busca aproximada de nomes em português.
 *
 * Os nomes da base vêm de digitação manual e de uma planilha antiga, então convivem grafias
 * diferentes da mesma pessoa: THIAGO/TIAGO, LUIS/LUIZ, WAGNER/VAGNER, SILVIA/SYLVIA... A
 * comparação combina duas técnicas: uma chave fonética (aproxima grafias que soam igual) e a
 * distância de edição sobre essa chave (tolera erros de digitação restantes).
 */

/** Remove acentos, pontuação e espaços extras, deixando tudo em maiúsculas. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Partículas que não ajudam a distinguir pessoas e por isso são ignoradas na comparação. */
const CONECTORES = new Set(['DE', 'DA', 'DAS', 'DO', 'DOS', 'E', 'DI', 'D'])

/**
 * Reduz uma palavra à sua "sonoridade" aproximada em português, para que grafias diferentes do
 * mesmo som cheguem à mesma chave.
 */
export function chaveFonetica(palavra: string): string {
  let p = normalizarTexto(palavra)

  // Dígrafos primeiro — depois o H solto perde a função e é descartado.
  p = p.replace(/PH/g, 'F')
  p = p.replace(/TH/g, 'T')
  p = p.replace(/CH/g, 'X')
  p = p.replace(/LH/g, 'L')
  p = p.replace(/NH/g, 'N')
  p = p.replace(/H/g, '')

  p = p.replace(/Y/g, 'I')
  p = p.replace(/W/g, 'V')

  // C/Q/K convergem; G e C antes de E/I mudam de som.
  p = p.replace(/QU/g, 'K').replace(/Q/g, 'K')
  p = p.replace(/GU([EI])/g, 'G$1')
  p = p.replace(/G([EI])/g, 'J$1')
  p = p.replace(/C([EI])/g, 'S$1')
  p = p.replace(/C/g, 'K')

  // Sibilantes convergem para S.
  p = p.replace(/SS/g, 'S')
  p = p.replace(/Z/g, 'S')
  p = p.replace(/XC/g, 'S')

  // Letras repetidas não mudam o som (ANNA -> ANA, GUILHERME -> GILERME).
  p = p.replace(/(.)\1+/g, '$1')

  return p
}

/** Distância de edição (Levenshtein) entre duas palavras. */
export function distanciaEdicao(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i++) {
    const atual = [i]
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1
      atual[j] = Math.min(atual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + custo)
    }
    anterior = atual
  }

  return anterior[b.length]
}

/** Semelhança entre duas palavras (0 a 1), já comparando pela sonoridade. */
export function similaridadePalavra(a: string, b: string): number {
  const chaveA = chaveFonetica(a)
  const chaveB = chaveFonetica(b)
  if (!chaveA || !chaveB) return 0
  if (chaveA === chaveB) return 1

  const maior = Math.max(chaveA.length, chaveB.length)
  return Math.max(0, 1 - distanciaEdicao(chaveA, chaveB) / maior)
}

/** Palavras significativas de um nome (ignora conectores como "DE", "DA", "DOS"). */
export function palavrasDoNome(nome: string): string[] {
  return normalizarTexto(nome)
    .split(' ')
    .filter((t) => t.length > 1 && !CONECTORES.has(t))
}

const tokens = palavrasDoNome

/**
 * Semelhança entre dois nomes completos (0 a 1).
 *
 * Cada palavra do nome procurado é casada com a palavra mais parecida do candidato. O primeiro
 * nome pesa mais que os sobrenomes, porque é o que as pessoas informam com mais consistência.
 * Nomes com mais palavras em comum sobem; palavras sobrando no candidato quase não penalizam
 * (é comum a pessoa dizer só parte do nome que está na ficha).
 */
export function similaridadeNome(consulta: string, candidato: string): number {
  const palavrasConsulta = tokens(consulta)
  const palavrasCandidato = tokens(candidato)

  if (palavrasConsulta.length === 0 || palavrasCandidato.length === 0) return 0

  let somaPesos = 0
  let somaPontos = 0

  palavrasConsulta.forEach((palavra, indice) => {
    const peso = indice === 0 ? 2 : 1
    const melhor = Math.max(...palavrasCandidato.map((outra) => similaridadePalavra(palavra, outra)))
    somaPontos += melhor * peso
    somaPesos += peso
  })

  const media = somaPontos / somaPesos

  // Pequeno ajuste: nomes de tamanhos muito diferentes têm chance maior de casamento acidental.
  const proporcao =
    Math.min(palavrasConsulta.length, palavrasCandidato.length) /
    Math.max(palavrasConsulta.length, palavrasCandidato.length)

  return media * (0.85 + 0.15 * proporcao)
}
