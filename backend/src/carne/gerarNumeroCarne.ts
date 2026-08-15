import { createFirestoreDocumentWithId, getFirestoreDocument, patchFirestoreDocument } from "../firestore/rest";

/**
 * Dizimistas já existentes mantêm o número do carnê físico que já possuem
 * (geralmente 3 dígitos) e o informam manualmente no recadastramento — este
 * módulo não interfere nesses números.
 *
 * Novos dizimistas (cadastro pelo admin) recebem números sequenciais,
 * começando em 1000 (4 dígitos), controlados por um contador no Firestore.
 */

const NUMERO_CARNE_INICIAL = 1000;
const CONTADOR_COLECAO = "contadores";
const CONTADOR_DOCUMENTO = "proximoNumeroCarne";
const CONTADOR_PATH = `${CONTADOR_COLECAO}/${CONTADOR_DOCUMENTO}`;

async function lerProximoNumero(): Promise<number> {
    const doc = await getFirestoreDocument<{ valor?: number }>(CONTADOR_PATH);
    const valor = doc?.data.valor;
    return typeof valor === "number" && Number.isInteger(valor) && valor >= NUMERO_CARNE_INICIAL
        ? valor
        : NUMERO_CARNE_INICIAL;
}

async function persistirProximoNumero(valor: number): Promise<void> {
    const existe = await getFirestoreDocument(CONTADOR_PATH);
    if (existe) {
        await patchFirestoreDocument(CONTADOR_PATH, { valor });
    } else {
        await createFirestoreDocumentWithId(CONTADOR_COLECAO, CONTADOR_DOCUMENTO, { valor });
    }
}

/**
 * Reserva o próximo número de carnê sequencial disponível, criando o documento
 * do dizimista de forma atômica (ID explícito no Firestore, que rejeita
 * duplicatas) para evitar corrida entre cadastros simultâneos. Se o número já
 * estiver em uso — por exemplo, coincidindo com um carnê físico legado de 3
 * dígitos que por acaso caia acima de 999 — tenta o próximo, em sequência.
 * Retorna o número de carnê reservado, ou null se não conseguir após
 * `maxTentativas`.
 */
export async function reservarProximoNumeroCarne(
    dadosDizimista: Record<string, unknown>,
    maxTentativas = 20,
): Promise<string | null> {
    let candidato = await lerProximoNumero();

    for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
        const numeroCarne = String(candidato);
        const resultado = await createFirestoreDocumentWithId("dizimistas", numeroCarne, {
            ...dadosDizimista,
            numeroCarne,
        });

        if (resultado.created) {
            await persistirProximoNumero(candidato + 1);
            return numeroCarne;
        }

        candidato += 1;
    }

    return null;
}
