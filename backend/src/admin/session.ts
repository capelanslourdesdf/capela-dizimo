import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

function resolveSecret(): string {
    const secret = process.env.ADMIN_SESSION_SECRET || "";
    if (!secret.trim()) {
        throw new Error("ADMIN_SESSION_SECRET is not configured");
    }
    return secret;
}

/**
 * Token opaco assinado (HMAC) sem estado no servidor: carrega só a expiração.
 * Suficiente para proteger a única ação admin que passa pelo backend (gerar carnê),
 * já que as regras do Firestore são abertas nesta fase.
 */
export function issueAdminToken(ttlMs: number = DEFAULT_TTL_MS): { token: string; expiresAt: number } {
    const expiresAt = Date.now() + ttlMs;
    const payload = Buffer.from(JSON.stringify({ exp: expiresAt })).toString("base64url");
    const signature = createHmac("sha256", resolveSecret()).update(payload).digest("base64url");
    return { token: `${payload}.${signature}`, expiresAt };
}

export function verifyAdminToken(token: string | undefined | null): boolean {
    if (!token) return false;
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;

    const expected = createHmac("sha256", resolveSecret()).update(payload).digest("base64url");

    try {
        if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
    } catch {
        return false;
    }

    try {
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
        return typeof data.exp === "number" && data.exp > Date.now();
    } catch {
        return false;
    }
}
