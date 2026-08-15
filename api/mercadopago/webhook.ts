import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MercadoPagoApiError } from "../../backend/src/mercadopago/client";
import { getPaymentById } from "../../backend/src/mercadopago/payments";
import { isMercadoPagoWebhookSignatureValid } from "../../backend/src/mercadopago/webhook-signature";
import { patchFirestoreDocument } from "../../backend/src/firestore/rest";

function resolveWebhookPaymentId(payload: unknown): string | null {
    const event = payload as { data?: { id?: string | number }; type?: string; action?: string };
    if (!event?.data?.id) return null;
    if (event.type && event.type !== "payment") return null;
    if (event.action && !event.action.startsWith("payment.")) return null;
    return String(event.data.id);
}

function mapStatus(mpStatus: string | undefined): "pendente" | "aprovado" | "rejeitado" {
    if (mpStatus === "approved") return "aprovado";
    if (mpStatus === "rejected" || mpStatus === "cancelled") return "rejeitado";
    return "pendente";
}

function headerValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "method_not_allowed" });
        return;
    }

    try {
        const paymentId = resolveWebhookPaymentId(req.body);
        if (!paymentId) {
            res.status(200).json({ ok: true, ignored: true });
            return;
        }

        const signatureValid = isMercadoPagoWebhookSignatureValid({
            secret: process.env.MERCADOPAGO_WEBHOOK_SECRET || "",
            xSignatureHeader: headerValue(req.headers["x-signature"]),
            xRequestIdHeader: headerValue(req.headers["x-request-id"]),
            dataId: paymentId,
        });

        if (!signatureValid) {
            res.status(401).json({ ok: false, error: "invalid_signature" });
            return;
        }

        const payment = await getPaymentById(paymentId);
        const [numeroCarne, pagamentoId] = (payment.externalReference || "").split(":");

        if (!numeroCarne || !pagamentoId) {
            res.status(200).json({ ok: true, ignored: true });
            return;
        }

        await patchFirestoreDocument(`dizimistas/${numeroCarne}/pagamentos/${pagamentoId}`, {
            status: mapStatus(payment.status),
            atualizadoEm: new Date().toISOString(),
        });

        res.status(200).json({ ok: true, updated: true });
    } catch (error) {
        console.error("mercadopago webhook error:", error);

        if (error instanceof MercadoPagoApiError) {
            res.status(error.status).json({ ok: false, error: error.message });
            return;
        }

        res.status(500).json({ ok: false, error: "webhook_failed" });
    }
}
