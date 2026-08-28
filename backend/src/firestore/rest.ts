/**
 * Cliente mínimo para a REST API do Firestore, usado pelas funções serverless.
 * As regras do Firestore deste projeto são abertas (allow read, write: if true),
 * então não é necessário nenhum token/API key para chamar essa API — o projectId
 * na URL basta.
 */

type FirestoreValue =
    | { stringValue: string }
    | { integerValue: string }
    | { doubleValue: number }
    | { booleanValue: boolean }
    | { nullValue: null }
    | { mapValue: { fields?: Record<string, FirestoreValue> } }
    | { arrayValue: { values?: FirestoreValue[] } };

type FirestoreDocument = {
    name?: string;
    fields?: Record<string, FirestoreValue>;
};

function resolveProjectId(): string {
    const projectId = process.env.FIREBASE_PROJECT_ID || "";
    if (!projectId.trim()) {
        throw new Error("FIREBASE_PROJECT_ID is not configured");
    }
    return projectId;
}

function baseDocumentsUrl(): string {
    return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(resolveProjectId())}/databases/(default)/documents`;
}

function encodeValue(value: unknown): FirestoreValue {
    if (value === null || value === undefined) return { nullValue: null };
    if (typeof value === "string") return { stringValue: value };
    if (typeof value === "boolean") return { booleanValue: value };
    if (typeof value === "number") {
        return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    }
    if (Array.isArray(value)) {
        return { arrayValue: { values: value.map((item) => encodeValue(item)) } };
    }
    if (typeof value === "object") {
        return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } };
    }
    throw new Error(`Unsupported Firestore value type: ${typeof value}`);
}

function encodeFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
    const out: Record<string, FirestoreValue> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) continue;
        out[key] = encodeValue(value);
    }
    return out;
}

function decodeValue(value: FirestoreValue): unknown {
    if ("stringValue" in value) return value.stringValue;
    if ("integerValue" in value) return Number(value.integerValue);
    if ("doubleValue" in value) return value.doubleValue;
    if ("booleanValue" in value) return value.booleanValue;
    if ("nullValue" in value) return null;
    if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
    if ("arrayValue" in value) return (value.arrayValue.values || []).map((item) => decodeValue(item));
    return null;
}

function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
        out[key] = decodeValue(value);
    }
    return out;
}

function decodeDocumentId(name: string | undefined): string {
    if (!name) return "";
    const parts = name.split("/");
    return parts[parts.length - 1] || "";
}

export type FirestoreDoc<T> = { id: string; data: T };

export async function getFirestoreDocument<T = Record<string, unknown>>(path: string): Promise<FirestoreDoc<T> | null> {
    const response = await fetch(`${baseDocumentsUrl()}/${path}`);

    if (response.status === 404) return null;
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Firestore GET failed (${response.status}): ${body || "unknown_error"}`);
    }

    const doc = (await response.json()) as FirestoreDocument;
    return { id: decodeDocumentId(doc.name), data: decodeFields(doc.fields || {}) as T };
}

/**
 * Cria um documento com ID explícito. Se já existir, a API do Firestore responde 409
 * (ALREADY_EXISTS) — usado para garantir unicidade do número de carnê sem race condition.
 */
export async function createFirestoreDocumentWithId(
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
): Promise<{ created: boolean }> {
    const url = `${baseDocumentsUrl()}/${collectionPath}?documentId=${encodeURIComponent(documentId)}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: encodeFields(data) }),
    });

    if (response.status === 409) return { created: false };
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Firestore create failed (${response.status}): ${body || "unknown_error"}`);
    }

    return { created: true };
}

export async function createFirestoreDocument(collectionPath: string, data: Record<string, unknown>): Promise<FirestoreDoc<Record<string, unknown>>> {
    const response = await fetch(`${baseDocumentsUrl()}/${collectionPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: encodeFields(data) }),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Firestore create failed (${response.status}): ${body || "unknown_error"}`);
    }

    const doc = (await response.json()) as FirestoreDocument;
    return { id: decodeDocumentId(doc.name), data: decodeFields(doc.fields || {}) };
}

/** Lista TODOS os documentos de uma coleção, seguindo a paginação da API até o fim. */
export async function listFirestoreCollection<T = Record<string, unknown>>(collectionPath: string): Promise<FirestoreDoc<T>[]> {
    const documentos: FirestoreDoc<T>[] = [];
    const tokensVistos = new Set<string>();
    let pageToken = "";

    do {
        const url = new URL(`${baseDocumentsUrl()}/${collectionPath}`);
        url.searchParams.set("pageSize", "300");
        if (pageToken) url.searchParams.set("pageToken", pageToken);

        const response = await fetch(url.toString());
        if (response.status === 404) return documentos;
        if (!response.ok) {
            const body = await response.text().catch(() => "");
            throw new Error(`Firestore list failed (${response.status}): ${body || "unknown_error"}`);
        }

        const body = (await response.json()) as { documents?: FirestoreDocument[]; nextPageToken?: string };
        const pagina = body.documents || [];
        for (const doc of pagina) {
            documentos.push({ id: decodeDocumentId(doc.name), data: decodeFields(doc.fields || {}) as T });
        }
        const proximo = pagina.length > 0 ? body.nextPageToken || "" : "";
        pageToken = proximo && !tokensVistos.has(proximo) ? proximo : "";
        if (proximo) tokensVistos.add(proximo);
    } while (pageToken);

    return documentos;
}

export type CollectionGroupDoc<T> = FirestoreDoc<T> & { parentId: string };

/**
 * Roda uma structured query numa collection group (ex.: `devolucoes`, em todas as subcoleções de
 * `dizimistas/*`), opcionalmente filtrando por um campo com `>=`. Usado pelo Cron de recálculo de
 * status para ler só as devoluções recentes (últimos meses) de todo mundo numa única chamada, em
 * vez de uma leitura por dizimista.
 */
export async function runCollectionGroupQuery<T = Record<string, unknown>>(
    collectionId: string,
    filtro?: { campo: string; operador: "GREATER_THAN_OR_EQUAL"; valor: string },
): Promise<CollectionGroupDoc<T>[]> {
    const structuredQuery: Record<string, unknown> = {
        from: [{ collectionId, allDescendants: true }],
    };
    if (filtro) {
        structuredQuery.where = {
            fieldFilter: {
                field: { fieldPath: filtro.campo },
                op: filtro.operador,
                value: encodeValue(filtro.valor),
            },
        };
    }

    const resultados: CollectionGroupDoc<T>[] = [];
    const response = await fetch(`${baseDocumentsUrl()}:runQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structuredQuery }),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Firestore runQuery failed (${response.status}): ${body || "unknown_error"}`);
    }

    const corpo = (await response.json()) as Array<{ document?: FirestoreDocument }>;
    for (const item of corpo) {
        if (!item.document?.name) continue;
        const partes = item.document.name.split("/");
        // .../documents/dizimistas/{carne}/devolucoes/{id} -> parentId = carne (penúltimo segmento antes do id da devolução)
        const parentId = partes[partes.length - 3] || "";
        resultados.push({ id: decodeDocumentId(item.document.name), data: decodeFields(item.document.fields || {}) as T, parentId });
    }

    return resultados;
}

export async function patchFirestoreDocument(path: string, data: Record<string, unknown>): Promise<void> {
    const url = new URL(`${baseDocumentsUrl()}/${path}`);
    Object.keys(data).forEach((fieldPath) => url.searchParams.append("updateMask.fieldPaths", fieldPath));

    const response = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: encodeFields(data) }),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Firestore PATCH failed (${response.status}): ${body || "unknown_error"}`);
    }
}
