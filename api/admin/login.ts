import type { VercelRequest, VercelResponse } from "@vercel/node";
import { issueAdminToken } from "../../backend/src/admin/session";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") {
            res.status(405).json({ ok: false, error: "method_not_allowed" });
            return;
        }

        const body = (req.body || {}) as { usuario?: string; senha?: string };
        const usuarioEsperado = process.env.ADMIN_USERNAME || "";
        const senhaEsperada = process.env.ADMIN_PASSWORD || "";

        if (!usuarioEsperado || !senhaEsperada) {
            res.status(500).json({ ok: false, error: "admin_credentials_not_configured" });
            return;
        }

        if (body.usuario !== usuarioEsperado || body.senha !== senhaEsperada) {
            res.status(401).json({ ok: false, error: "invalid_credentials" });
            return;
        }

        try {
            const { token, expiresAt } = issueAdminToken();
            res.status(200).json({ ok: true, token, expiresAt });
        } catch (err) {
            // Credenciais corretas, mas ADMIN_SESSION_SECRET não está configurado — sem isso não
            // é possível emitir o token de sessão. Retornamos um erro distinto para não parecer
            // que o usuário/senha estão errados.
            console.error("[api/admin/login] falha ao emitir token:", err);
            res.status(500).json({ ok: false, error: "admin_session_secret_not_configured" });
        }
    } catch (err) {
        // Qualquer falha inesperada (ex.: corpo da requisição malformado). Logamos o erro real
        // nos logs da função (Vercel → Deployments → Functions) e devolvemos um erro genérico,
        // mas identificável, ao invés de deixar a plataforma responder com uma página de erro.
        console.error("[api/admin/login] erro inesperado:", err);
        res.status(500).json({ ok: false, error: "internal_error" });
    }
}
