import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MercadoPagoApiError } from "../../backend/src/mercadopago/client";
import { getPaymentById } from "../../backend/src/mercadopago/payments";
import { getFirestoreDocument, patchFirestoreDocument } from "../../backend/src/firestore/rest";

type PagamentoDoc = {
    valor?: number;
    status?: string;
    mercadoPagoPaymentId?: string;
};

function mapStatus(mpStatus: string | undefined): "pendente" | "aprovado" | "rejeitado" {
    if (mpStatus === "approved") return "aprovado";
    if (mpStatus === "rejected" || mpStatus === "cancelled") return "rejeitado";
    return "pendente";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.status(405).json({ success: false, error: { message: "Método não permitido." } });
        return;
    }

    try {
        const numeroCarne = String(req.query.numeroCarne || "").trim();
        const pagamentoId = String(req.query.pagamentoId || "").trim();

        if (!numeroCarne || !pagamentoId) {
            res.status(400).json({ success: false, error: { message: "numeroCarne e pagamentoId são obrigatórios." } });
            return;
        }

        const path = `dizimistas/${numeroCarne}/pagamentos/${pagamentoId}`;
        const pagamento = await getFirestoreDocument<PagamentoDoc>(path);

        if (!pagamento) {
            res.status(404).json({ success: false, error: { message: "Pagamento não encontrado." } });
            return;
        }

        if (!pagamento.data.mercadoPagoPaymentId) {
            res.status(200).json({ success: true, payment: { status: pagamento.data.status || "pendente" } });
            return;
        }

        const mpPayment = await getPaymentById(pagamento.data.mercadoPagoPaymentId);
        const statusNovo = mapStatus(mpPayment.status);

        if (statusNovo !== pagamento.data.status) {
            await patchFirestoreDocument(path, {
                status: statusNovo,
                atualizadoEm: new Date().toISOString(),
            });
        }

        res.status(200).json({
            success: true,
            payment: { status: statusNovo, valor: pagamento.data.valor },
        });
    } catch (error) {
        console.error("payment-status error:", error);

        if (error instanceof MercadoPagoApiError) {
            res.status(error.status).json({ success: false, error: { message: error.message } });
            return;
        }

        const message = error instanceof Error ? error.message : "proxy_unavailable";
        res.status(500).json({ success: false, error: { message } });
    }
}
