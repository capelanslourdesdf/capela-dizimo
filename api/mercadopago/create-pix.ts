import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MercadoPagoApiError } from "../../backend/src/mercadopago/client";
import { createPixPayment } from "../../backend/src/mercadopago/payments";
import { createFirestoreDocument, getFirestoreDocument, patchFirestoreDocument } from "../../backend/src/firestore/rest";

type CreatePixBody = {
    numeroCarne?: string;
    valor?: number;
};

type DizimistaDoc = {
    nomeCompleto?: string;
    email?: string;
};

function competenciaAtual(): string {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function resolveOrigin(req: VercelRequest): string {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const proto = typeof forwardedProto === "string" ? forwardedProto : "https";
    return `${proto}://${req.headers.host}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.status(405).json({ success: false, error: { message: "Método não permitido." } });
        return;
    }

    try {
        const body = (req.body || {}) as CreatePixBody;
        const numeroCarne = body.numeroCarne?.trim();
        const valor = Number(body.valor);

        if (!numeroCarne) {
            res.status(400).json({ success: false, error: { message: "Número do carnê é obrigatório." } });
            return;
        }

        if (!Number.isFinite(valor) || valor <= 0) {
            res.status(400).json({ success: false, error: { message: "Valor inválido." } });
            return;
        }

        const dizimista = await getFirestoreDocument<DizimistaDoc>(`dizimistas/${encodeURIComponent(numeroCarne)}`);
        if (!dizimista) {
            res.status(404).json({ success: false, error: { message: "Dizimista não encontrado." } });
            return;
        }

        const competencia = competenciaAtual();
        const agora = new Date().toISOString();

        const pagamentoDoc = await createFirestoreDocument(`dizimistas/${numeroCarne}/pagamentos`, {
            valor,
            competencia,
            status: "pendente",
            criadoEm: agora,
            atualizadoEm: agora,
        });

        const nomeCompleto = dizimista.data.nomeCompleto || "Dizimista";
        const [firstName, ...restName] = nomeCompleto.split(" ");
        // Pix no Mercado Pago exige e-mail do pagador; e-mail é opcional no cadastro do dizimista.
        const email = dizimista.data.email?.trim() || `carne-${numeroCarne}@sem-email.capela-dizimo.app`;

        const payment = await createPixPayment({
            transactionAmount: valor,
            description: `Dízimo - ${competencia} - ${nomeCompleto}`,
            externalReference: `${numeroCarne}:${pagamentoDoc.id}`,
            notificationUrl: `${resolveOrigin(req)}/api/mercadopago/webhook`,
            payer: {
                email,
                firstName,
                lastName: restName.join(" ") || undefined,
            },
        });

        await patchFirestoreDocument(`dizimistas/${numeroCarne}/pagamentos/${pagamentoDoc.id}`, {
            mercadoPagoPaymentId: payment.id || "",
            pixCopiaCola: payment.qrCode || "",
            pixQrCodeBase64: payment.qrCodeBase64 || "",
            atualizadoEm: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            payment: {
                pagamentoId: pagamentoDoc.id,
                mercadoPagoPaymentId: payment.id,
                status: payment.status,
                qrCode: payment.qrCode,
                qrCodeBase64: payment.qrCodeBase64,
                ticketUrl: payment.ticketUrl,
            },
        });
    } catch (error) {
        console.error("create-pix error:", error);

        if (error instanceof MercadoPagoApiError) {
            res.status(error.status).json({ success: false, error: { message: error.message } });
            return;
        }

        const message = error instanceof Error ? error.message : "proxy_unavailable";
        res.status(500).json({
            success: false,
            error: { message },
            hint: "Configure MERCADOPAGO_ACCESS_TOKEN e FIREBASE_PROJECT_ID nas variáveis de ambiente da Vercel.",
        });
    }
}
