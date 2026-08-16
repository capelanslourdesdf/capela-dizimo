import type { VercelRequest, VercelResponse } from "@vercel/node";
import { reservarProximoNumeroCarne } from "../../backend/src/carne/gerarNumeroCarne";

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

const MAX_FILHOS = 4;

// O login da Pastoral agora é verificado inteiramente no navegador (ver
// frontend/src/hooks/useAdminSessao.tsx), sem segredo compartilhado com o backend. Como as
// regras do Firestore já são abertas (allow read, write: if true), este endpoint só existe
// para gerar o número sequencial do carnê — não há um token de admin para validar aqui.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "method_not_allowed" });
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

    // "aaaa-mm-dd" -> "dd/mm". É por esse campo que o login confere o nascimento, já que os
    // registros importados da planilha antiga não possuem o ano.
    const matchData = body.dataNascimento.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const diaMesNascimento = matchData ? `${matchData[3]}/${matchData[2]}` : "";

    const agora = new Date().toISOString();
    const dados: Record<string, unknown> = {
        nomeCompleto: body.nomeCompleto.trim(),
        dataNascimento: body.dataNascimento,
        diaMesNascimento,
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

    const numeroCarne = await reservarProximoNumeroCarne(dados);

    if (!numeroCarne) {
        res.status(500).json({ ok: false, error: "nao_foi_possivel_gerar_carne" });
        return;
    }

    res.status(201).json({ ok: true, numeroCarne });
}
