export type SegmentoMotivacional = 'nunca' | 'irregular' | 'regular'

/**
 * Mensagens curtas mostradas no painel do dizimista, uma sorteada a cada visita — pensadas pra
 * incentivar sem cobrar: quem nunca devolveu ganha um convite, quem devolve às vezes ganha um
 * empurrãozinho, quem é regular ganha reconhecimento. A do segmento "regular" aceita `{meses}`,
 * trocado pelo streak de meses consecutivos.
 */
export const MENSAGENS_MOTIVACIONAIS: Record<SegmentoMotivacional, string[]> = {
  nunca: [
    'Seu primeiro dízimo pode começar hoje mesmo — toque em "Devolver meu dízimo" e faça parte dessa família! 🙏',
    'A Capela cresce com a generosidade de cada um. Que tal dar o primeiro passo hoje? 💙',
    'Nunca é tarde para começar! Sua contribuição, do tamanho que for, já faz diferença. ✨',
    'Toda grande jornada começa com um passo. Que tal começar a sua com o dízimo deste mês? 🌱',
    'Sua fé e sua generosidade juntas fortalecem toda a nossa comunidade. Vamos começar? 🤝',
  ],
  irregular: [
    'Toda contribuição conta, mesmo quando a rotina atrapalha. Que tal regularizar este mês? 💪',
    'Você já demonstrou generosidade antes — vamos manter esse hábito vivo? 🙌',
    'Um passo de cada vez: colocar o dízimo em dia fortalece você e a nossa Capela. 🕊️',
    'Sua contribuição já fez diferença antes. Continue escrevendo essa história com a gente! 📖',
    'Não deixe a rotina levar o hábito embora — retome seu dízimo hoje mesmo. ⏳💙',
  ],
  regular: [
    'Parabéns 🎉! Você contribuiu com a Capela por {meses} meses consecutivos!',
    'Que exemplo de fidelidade! Já são {meses} meses seguidos contribuindo. Gratidão! 🙏✨',
    '{meses} meses consecutivos de generosidade — você é parte fundamental dessa comunidade! 💙',
    'Sua constância inspira! {meses} meses seguidos cuidando da nossa Capela. Muito obrigado! 🌟',
    'Fidelidade que transforma: {meses} meses consecutivos de dízimo. Continue brilhando! ✨🙌',
  ],
}

/** Sorteia uma mensagem do segmento e já troca `{meses}` pelo streak informado. */
export function sortearMensagemMotivacional(segmento: SegmentoMotivacional, mesesConsecutivos: number): string {
  const opcoes = MENSAGENS_MOTIVACIONAIS[segmento]
  const escolhida = opcoes[Math.floor(Math.random() * opcoes.length)]
  return escolhida.replace('{meses}', String(mesesConsecutivos))
}
