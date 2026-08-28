import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
    getFirestoreDocument,
    listFirestoreCollection,
    patchFirestoreDocument,
    runCollectionGroupQuery,
} from "../../backend/src/firestore/rest";

/**
 * Recalcula, 1x por dia, `status` (Ativo/Inativo) e `mesNascimento` de todos os dizimistas, e
 * reconstrói `agregados/statusDizimistas` (contagem usada nos cards da tela de Dizimistas).
 *
 * As gravações do dia a dia (lançar/editar/excluir devolução, ver
 * `frontend/src/services/devolucaoService.ts`) já recalculam o status de UM dizimista na hora.
 * Isso cobre a maioria dos casos, mas não pega quem muda de Ativo pra Inativo só pela passagem do
 * tempo — sem ninguém gravar nada (ex.: parou de devolver e, alguns meses depois, ninguém mexeu no
 * cadastro dele). Esse caso só é corrigido aqui, recalculando todo mundo do zero.
 *
 * Agendado em `vercel.json` (`crons`). A Vercel manda `Authorization: Bearer <CRON_SECRET>`
 * automaticamente quando essa env var está configurada no projeto — é assim que este endpoint
 * confere que a chamada veio do Cron, e não de qualquer um (as regras do Firestore são abertas,
 * mas esse endpoint grava em massa, então merece essa checagem extra).
 */

const JANELA_MESES_STATUS = 6;
const MINIMO_MESES_ATIVOS_PADRAO = 3;

function competenciaAtual(): string {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function subtrairMeses(competencia: string, meses: number): string {
    const [ano, mes] = competencia.split("-").map(Number);
    const data = new Date(ano, mes - 1 - meses, 1);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function competenciasEntre(inicio: string, fim: string): string[] {
    if (!/^\d{4}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}$/.test(fim) || inicio > fim) return [];
    const competencias: string[] = [];
    let [ano, mes] = inicio.split("-").map(Number);
    for (let i = 0; i < 600; i++) {
        const atual = `${ano}-${String(mes).padStart(2, "0")}`;
        competencias.push(atual);
        if (atual === fim) break;
        mes++;
        if (mes > 12) {
            mes = 1;
            ano++;
        }
    }
    return competencias;
}

type DizimistaBasico = {
    recadastradoEm?: string;
    criadoEm?: string;
    origem?: string;
    diaMesNascimento?: string;
    status?: string;
    mesNascimento?: number;
};

function competenciaDeRegistro(d: DizimistaBasico): string {
    if (d.recadastradoEm) return d.recadastradoEm.slice(0, 7);
    if (d.origem === "importacao_planilha") return "";
    return (d.criadoEm || "").slice(0, 7);
}

function calcularStatusDizimista(
    registro: string,
    competenciasPagas: Set<string>,
    minimoMeses: number,
    competenciaReferencia: string,
): "ativo" | "inativo" {
    if (registro && registro > competenciaReferencia) return "ativo";
    const inicioJanela = subtrairMeses(competenciaReferencia, JANELA_MESES_STATUS - 1);
    const inicioAplicavel = registro && inicioJanela < registro ? registro : inicioJanela;
    const janela = competenciasEntre(inicioAplicavel, competenciaReferencia);
    const minimoEfetivo = Math.min(minimoMeses, janela.length);
    const mesesPagos = janela.filter((c) => competenciasPagas.has(c)).length;
    return mesesPagos >= minimoEfetivo ? "ativo" : "inativo";
}

function mesDoRegistro(diaMes?: string): number | undefined {
    const match = (diaMes || "").match(/^\d{2}\/(\d{2})$/);
    if (!match) return undefined;
    const mes = Number(match[1]);
    return mes >= 1 && mes <= 12 ? mes : undefined;
}

function competenciaDaDevolucao(dados: { competencia?: string; data?: string; criadoEm?: string }): string {
    return dados.competencia || (dados.data ? dados.data.slice(0, 7) : "") || (dados.criadoEm || "").slice(0, 7);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const auth = req.headers.authorization;
        if (auth !== `Bearer ${cronSecret}`) {
            res.status(401).json({ ok: false, error: "unauthorized" });
            return;
        }
    }

    try {
        const configGeral = await getFirestoreDocument<{ minimoMesesAtivos?: number }>("configuracoes/geral");
        const minimoMesesAtivos =
            typeof configGeral?.data.minimoMesesAtivos === "number" ? configGeral.data.minimoMesesAtivos : MINIMO_MESES_ATIVOS_PADRAO;

        const referencia = competenciaAtual();
        const desde = subtrairMeses(referencia, JANELA_MESES_STATUS - 1);

        const [dizimistas, devolucoesRecentes] = await Promise.all([
            listFirestoreCollection<DizimistaBasico>("dizimistas"),
            runCollectionGroupQuery<{ competencia?: string; data?: string; criadoEm?: string; valor?: number }>("devolucoes", {
                campo: "competencia",
                operador: "GREATER_THAN_OR_EQUAL",
                valor: desde,
            }),
        ]);

        const competenciasPagasPorCarne = new Map<string, Set<string>>();
        for (const { parentId, data } of devolucoesRecentes) {
            const competencia = competenciaDaDevolucao(data);
            if (!/^\d{4}-\d{2}$/.test(competencia)) continue;
            const set = competenciasPagasPorCarne.get(parentId) ?? new Set<string>();
            set.add(competencia);
            competenciasPagasPorCarne.set(parentId, set);
        }

        let ativos = 0;
        let inativos = 0;
        let gravacoes = 0;

        await Promise.all(
            dizimistas.map(async ({ id, data }) => {
                const statusNovo = calcularStatusDizimista(
                    competenciaDeRegistro(data),
                    competenciasPagasPorCarne.get(id) ?? new Set(),
                    minimoMesesAtivos,
                    referencia,
                );
                if (statusNovo === "ativo") ativos++;
                else inativos++;

                const mesNovo = mesDoRegistro(data.diaMesNascimento);
                if (data.status !== statusNovo || data.mesNascimento !== mesNovo) {
                    gravacoes++;
                    await patchFirestoreDocument(`dizimistas/${encodeURIComponent(id)}`, {
                        status: statusNovo,
                        mesNascimento: mesNovo,
                    });
                }
            }),
        );

        await patchFirestoreDocument("agregados/statusDizimistas", { ativos, inativos });

        res.status(200).json({ ok: true, dizimistas: dizimistas.length, ativos, inativos, gravacoes });
    } catch (err) {
        res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "unknown_error" });
    }
}
