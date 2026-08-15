import { mercadoPagoRequest } from "./client";

export type CreatePixPaymentInput = {
    externalReference: string;
    description: string;
    transactionAmount: number;
    notificationUrl?: string;
    payer: {
        email: string;
        firstName?: string;
        lastName?: string;
        identification?: {
            type?: string;
            number?: string;
        };
    };
};

type MercadoPagoPaymentRaw = {
    id?: string | number;
    status?: string;
    status_detail?: string;
    external_reference?: string;
    transaction_amount?: number;
    payment_method_id?: string;
    point_of_interaction?: {
        transaction_data?: {
            qr_code?: string;
            qr_code_base64?: string;
            ticket_url?: string;
        };
    };
};

export type PaymentNormalized = {
    id?: string;
    status?: string;
    statusDetail?: string;
    externalReference?: string;
    transactionAmount?: number;
    paymentMethodId?: string;
    qrCode?: string | null;
    qrCodeBase64?: string | null;
    ticketUrl?: string | null;
};

function normalizePayment(payment: MercadoPagoPaymentRaw): PaymentNormalized {
    return {
        id: payment.id ? String(payment.id) : undefined,
        status: payment.status,
        statusDetail: payment.status_detail,
        externalReference: payment.external_reference,
        transactionAmount: payment.transaction_amount,
        paymentMethodId: payment.payment_method_id,
        qrCode: payment.point_of_interaction?.transaction_data?.qr_code || null,
        qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64 || null,
        ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url || null,
    };
}

export async function createPixPayment(input: CreatePixPaymentInput): Promise<PaymentNormalized> {
    const payload = await mercadoPagoRequest<MercadoPagoPaymentRaw>("/v1/payments", {
        method: "POST",
        headers: {
            "X-Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
            transaction_amount: input.transactionAmount,
            description: input.description,
            payment_method_id: "pix",
            external_reference: input.externalReference,
            notification_url: input.notificationUrl,
            payer: {
                email: input.payer.email,
                first_name: input.payer.firstName,
                last_name: input.payer.lastName,
                identification: input.payer.identification,
            },
        }),
    });

    return normalizePayment(payload);
}

export async function getPaymentById(paymentId: string): Promise<PaymentNormalized> {
    const payload = await mercadoPagoRequest<MercadoPagoPaymentRaw>(`/v1/payments/${encodeURIComponent(paymentId)}`, {
        method: "GET",
    });

    return normalizePayment(payload);
}
