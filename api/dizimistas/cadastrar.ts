import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAdminToken } from "../../backend/src/admin/session";
import { gerarCandidatoNumeroCarne } from "../../backend/src/carne/gerarNumeroCarne";
import { createFirestoreDocumentWithId } from "../../backend/src/firestore/rest";

type FamiliarBasico = { nomeCompleto?: string; dataNascimento?: string };

type CadastrarDizimistaBody = {
    nomeCompleto?: string;
    dataNascimento?: string;
    endereco?: {
        cep?: string;
        logradouro?: string;
        numero?: string;
        complemento?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
    };
    telefone?: string;
    email?: string;
    conjuge?: FamiliarBasico | null;
    filhos?: FamiliarBasico[];
};

const MAX_TENTATIVAS_CARNE = 8;
const MAX_FILHOS = 4;

function extractBearerToken(header: unknown): string | null {
    if (typeof header !== "string") return null;
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "method_not_allowed" });
        return;
    }

    if (!verifyAdminToken(extractBearerToken(req.headers.authorization))) {
        res.status(401).json({ ok: false, error: "unauthorized" });
        return;
    }

    const body = (req.body || {}) as CadastrarDizimistaBody;

    if (!body.nomeCompleto?.trim() || !body.dataNascimento?.trim() || !body.telefone?.trim()) {
        res.status(400).json({ ok: false, error: "campos_obrigatorios_ausentes" });
        return;
    }

    if (!body.endereco?.logradouro?.trim() || !body.endereco?.cidade?.trim() || !body.endereco?.estado?.trim()) {
        res.status(400).json({ ok: false, error: "endereco_incompleto" });
        return;
    }

    const filhos = (body.filhos || []).filter((f) => f.nomeCompleto?.trim());
    if (filhos.length > MAX_FILHOS) {
        res.status(400).json({ ok: false, error: "maximo_de_filhos_excedido" });
        return;
    }

    const agora = new Date().toISOString();
    const dados: Record<string, unknown> = {
        nomeCompleto: body.nomeCompleto.trim(),
        dataNascimento: body.dataNascimento,
        endereco: {
            cep: body.endereco.cep || "",
            logradouro: body.endereco.logradouro,
            numero: body.endereco.numero || "",
            complemento: body.endereco.complemento || "",
            bairro: body.endereco.bairro || "",
            cidade: body.endereco.cidade,
            estado: body.endereco.estado,
        },
        telefone: body.telefone,
        email: body.email?.trim() || null,
        conjuge: body.conjuge?.nomeCompleto?.trim()
            ? { nomeCompleto: body.conjuge.nomeCompleto.trim(), dataNascimento: body.conjuge.dataNascimento || "" }
            : null,
        filhos: filhos.map((f) => ({ nomeCompleto: f.nomeCompleto!.trim(), dataNascimento: f.dataNascimento || "" })),
        origem: "cadastro_admin",
        criadoEm: agora,
        atualizadoEm: agora,
    };

    for (let tentativa = 0; tentativa < MAX_TENTATIVAS_CARNE; tentativa++) {
        const candidato = gerarCandidatoNumeroCarne();
        const resultado = await createFirestoreDocumentWithId("dizimistas", candidato, {
            ...dados,
            numeroCarne: candidato,
        });

        if (resultado.created) {
            res.status(201).json({ ok: true, numeroCarne: candidato });
            return;
        }
    }

    res.status(500).json({ ok: false, error: "nao_foi_possivel_gerar_carne" });
}
