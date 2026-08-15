import { randomBytes } from "node:crypto";

const FAIXA_INICIO = 1_000_000n;
const FAIXA_TAMANHO = 9_000_000n;

/**
 * Gera um candidato a número de carnê a partir de 5 bytes aleatórios (40 bits de entropia),
 * mapeado para a faixa [1.000.000, 9.999.999]. Unicidade é responsabilidade de quem chama
 * (deve conferir no Firestore antes de persistir e tentar novamente em caso de colisão).
 */
export function gerarCandidatoNumeroCarne(): string {
    const bytes = randomBytes(5);
    let valor = 0n;
    for (const byte of bytes) {
        valor = (valor << 8n) | BigInt(byte);
    }
    const numero = FAIXA_INICIO + (valor % FAIXA_TAMANHO);
    return numero.toString();
}
