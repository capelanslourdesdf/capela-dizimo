import { createHmac, timingSafeEqual } from "node:crypto";

type SignatureParts = {
    ts: string;
    v1: string;
};

function parseSignatureHeader(value: string | null): SignatureParts | null {
    if (!value) return null;

    const pairs = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.split("="));

    const map = new Map<string, string>();
    for (const [key, raw] of pairs) {
        if (!key || !raw) continue;
        map.set(key, raw);
    }

    const ts = map.get("ts");
    const v1 = map.get("v1");
    if (!ts || !v1) return null;

    return { ts, v1 };
}

function normalizeHex(value: string): string {
    return value.trim().toLowerCase();
}

function safeEqualsHex(leftHex: string, rightHex: string): boolean {
    const left = normalizeHex(leftHex);
    const right = normalizeHex(rightHex);
    if (left.length !== right.length) return false;

    try {
        return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
    } catch {
        return false;
    }
}

export function isMercadoPagoWebhookSignatureValid(input: {
    secret?: string;
    xSignatureHeader: string | null;
    xRequestIdHeader: string | null;
    dataId: string | null;
}): boolean {
    const secret = (input.secret || "").trim();
    if (!secret) {
        // Signature enforcement disabled when secret is not configured.
        return true;
    }

    const dataId = (input.dataId || "").trim();
    const requestId = (input.xRequestIdHeader || "").trim();
    if (!dataId || !requestId) return false;

    const signature = parseSignatureHeader(input.xSignatureHeader);
    if (!signature) return false;

    // Mercado Pago manifest format for v1 signature.
    const manifest = `id:${dataId};request-id:${requestId};ts:${signature.ts};`;
    const expected = createHmac("sha256", secret).update(manifest).digest("hex");

    return safeEqualsHex(expected, signature.v1);
}
