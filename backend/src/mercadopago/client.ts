const MERCADOPAGO_API_BASE = "https://api.mercadopago.com";

export class MercadoPagoApiError extends Error {
    status: number;
    details?: unknown;

    constructor(message: string, status: number, details?: unknown) {
        super(message);
        this.name = "MercadoPagoApiError";
        this.status = status;
        this.details = details;
    }
}

function resolveAccessToken() {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
    if (!token.trim()) {
        throw new Error("MERCADOPAGO_ACCESS_TOKEN is not configured");
    }
    return token;
}

export async function mercadoPagoRequest<TResponse>(path: string, init: RequestInit): Promise<TResponse> {
    const accessToken = resolveAccessToken();

    const response = await fetch(`${MERCADOPAGO_API_BASE}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            ...(init.headers || {}),
        },
    });

    const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        cause?: Array<{ description?: string }>;
    } & TResponse;

    if (!response.ok) {
        const causeMessage = payload.cause?.[0]?.description;
        const message = causeMessage || payload.message || payload.error || "Mercado Pago request failed";
        throw new MercadoPagoApiError(message, response.status, payload);
    }

    return payload;
}
