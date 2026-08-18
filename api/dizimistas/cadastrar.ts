import type { VercelRequest, VercelResponse } from "@vercel/node";
import { reservarProximoNumeroCarne } from "../../backend/src/carne/gerarNumeroCarne";

type CadastrarDizimistaBody = {
    nomeCompleto?: string;
    dataNascimento?: string;
    telefone?: string;
};

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

    // "aaaa-mm-dd" -> "dd/mm". É por esse campo que o login confere o nascimento, já que os
    // registros importados da planilha antiga não possuem o ano.
    const matchData = body.dataNascimento.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const diaMesNascimento = matchData ? `${matchData[3]}/${matchData[2]}` : "";

    const agora = new Date().toISOString();
    const dados: Record<string, unknown> = {
        nomeCompleto: body.nomeCompleto.trim(),
        dataNascimento: body.dataNascimento,
        diaMesNascimento,
        telefone: body.telefone,
        origem: "cadastro_admin",
        recadastradoEm: agora,
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
