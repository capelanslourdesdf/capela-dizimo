import * as React from 'react'
import { Check, Copy, QrCode } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useDizimistaSessao } from '@/hooks/useDizimistaSessao'
import { consultarStatusPagamento, criarPagamentoPix, type CriarPixResultado } from '@/services/pagamentoService'
import type { StatusPagamento } from '@/types'
import { maskMoeda, moedaParaNumero } from '@/utils/format'

const STATUS_CONFIG: Record<StatusPagamento, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  aprovado: { label: 'Pago', variant: 'success' },
  pendente: { label: 'Aguardando pagamento', variant: 'warning' },
  rejeitado: { label: 'Não aprovado', variant: 'destructive' },
}

export function DizimistaPagamentoPage() {
  const { numeroCarne } = useDizimistaSessao()
  const [valor, setValor] = React.useState('')
  const [gerando, setGerando] = React.useState(false)
  const [pagamento, setPagamento] = React.useState<CriarPixResultado | null>(null)
  const [status, setStatus] = React.useState<StatusPagamento>('pendente')

  React.useEffect(() => {
    if (!pagamento || !numeroCarne || status !== 'pendente') return

    const intervalo = setInterval(async () => {
      try {
        const resultado = await consultarStatusPagamento(numeroCarne, pagamento.pagamentoId)
        setStatus(resultado.status)
      } catch {
        // silencioso: tenta novamente no próximo intervalo
      }
    }, 4000)

    return () => clearInterval(intervalo)
  }, [pagamento, status, numeroCarne])

  async function handleGerar(event: React.FormEvent) {
    event.preventDefault()
    if (!numeroCarne) return

    const valorNumerico = moedaParaNumero(valor)
    if (valorNumerico <= 0) {
      toast.error('Informe um valor válido.')
      return
    }

    setGerando(true)
    try {
      const resultado = await criarPagamentoPix(numeroCarne, valorNumerico)
      setPagamento(resultado)
      setStatus('pendente')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível gerar o Pix.')
    } finally {
      setGerando(false)
    }
  }

  function handleCopiar() {
    if (!pagamento?.qrCode) return
    navigator.clipboard.writeText(pagamento.qrCode)
    toast.success('Código Pix copiado.')
  }

  function handleNovoPagamento() {
    setPagamento(null)
    setValor('')
  }

  return (
    <div>
      <PageHeader title="Pagar com Pix" description="Gere um código Pix e contribua com poucos toques." />

      {!pagamento ? (
        <Card className="max-w-md">
          <CardContent>
            <form onSubmit={handleGerar} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="valor">Valor</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="valor"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0,00"
                    className="pl-9"
                    value={valor}
                    onChange={(e) => setValor(maskMoeda(e.target.value))}
                  />
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={gerando}>
                <QrCode className="h-4 w-4" />
                {gerando ? 'Gerando Pix...' : 'Gerar Pix'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <StatusBadge label={STATUS_CONFIG[status].label} variant={STATUS_CONFIG[status].variant} />

            {status === 'aprovado' ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                  <Check className="h-7 w-7" />
                </div>
                <p className="font-medium text-foreground">Pagamento confirmado!</p>
              </div>
            ) : (
              <>
                {pagamento.qrCodeBase64 && (
                  <img
                    src={`data:image/png;base64,${pagamento.qrCodeBase64}`}
                    alt="QR Code Pix"
                    className="h-56 w-56 rounded-lg border border-border"
                  />
                )}

                {pagamento.qrCode && (
                  <div className="w-full space-y-1.5 text-left">
                    <Label htmlFor="copia-cola">Pix copia e cola</Label>
                    <div className="flex gap-2">
                      <Input id="copia-cola" readOnly value={pagamento.qrCode} className="text-xs" />
                      <Button type="button" variant="outline" size="icon" onClick={handleCopiar} aria-label="Copiar código Pix">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Assim que o pagamento for identificado, esta tela é atualizada automaticamente.
                </p>
              </>
            )}

            <Button type="button" variant="outline" className="w-full" onClick={handleNovoPagamento}>
              Novo pagamento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
