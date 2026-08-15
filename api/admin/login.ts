import type { VercelRequest, VercelResponse } from "@vercel/node";
import { issueAdminToken } from "../../backend/src/admin/session";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const { token, expiresAt } = issueAdminToken();
    res.status(200).json({ ok: true, token, expiresAt });
}
