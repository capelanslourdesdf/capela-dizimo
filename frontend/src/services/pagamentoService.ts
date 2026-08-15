import { collection, getDocs, orderBy, query } from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { PagamentoPix } from '@/types'

export async function listarPagamentos(numeroCarne: string): Promise<PagamentoPix[]> {
  const ref = collection(db, 'dizimistas', numeroCarne, 'pagamentos')
  const snap = await getDocs(query(ref, orderBy('criadoEm', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PagamentoPix, 'id'>) }))
}

export type CriarPixResultado = {
  pagamentoId: string
  status: string
  qrCode: string | null
  qrCodeBase64: string | null
  ticketUrl: string | null
}

export async function criarPagamentoPix(numeroCarne: string, valor: number): Promise<CriarPixResultado> {
  const response = await fetch('/api/mercadopago/create-pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numeroCarne, valor }),
  })

  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean
    payment?: CriarPixResultado
    error?: { message?: string }
  }

  if (!response.ok || !payload.success || !payload.payment) {
    throw new Error(payload.error?.message || 'Não foi possível gerar o Pix. Tente novamente.')
  }

  return payload.payment
}

export async function consultarStatusPagamento(
  numeroCarne: string,
  pagamentoId: string,
): Promise<{ status: 'pendente' | 'aprovado' | 'rejeitado' }> {
  const params = new URLSearchParams({ numeroCarne, pagamentoId })
  const response = await fetch(`/api/mercadopago/payment-status?${params.toString()}`)

  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean
    payment?: { status?: string }
  }

  if (!response.ok || !payload.success || !payload.payment?.status) {
    throw new Error('Não foi possível consultar o status do pagamento.')
  }

  return { status: payload.payment.status as 'pendente' | 'aprovado' | 'rejeitado' }
}
