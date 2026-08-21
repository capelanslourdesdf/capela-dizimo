import * as React from 'react'
import { Check, Copy, Info, QrCode, RefreshCw, Smartphone, Timer } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MesAnoPicker } from '@/components/ui/mes-ano-picker'
import { cn } from '@/lib/utils'

import { competenciaAtual, maskMoedaCentavos, moedaParaNumero } from '@/utils/format'

const DURACAO_TIMER_SEGUNDOS = 5 * 60
const DURACAO_COPIADO_MS = 3000
const TAMANHO_QR = 25

/** Grade fictícia só para parecer um QR code — sem nenhum significado real. */
function gerarModulosQrFicticio(tamanho: number): boolean[][] {
  const modulos = Array.from({ length: tamanho }, () =>
    Array.from({ length: tamanho }, () => Math.random() > 0.55),
  )

  function desenharMarcador(linha: number, coluna: number) {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const bordaExterna = i === 0 || i === 6 || j === 0 || j === 6
        const nucleo = i >= 2 && i <= 4 && j >= 2 && j <= 4
        modulos[linha + i][coluna + j] = bordaExterna || nucleo
      }
    }
  }

  desenharMarcador(0, 0)
  desenharMarcador(0, tamanho - 7)
  desenharMarcador(tamanho - 7, 0)

  return modulos
}

/** Código Pix "copia e cola" fictício — só para demonstração, não é um Pix real. */
function gerarCodigoPixFicticio(): string {
  const aleatorio = Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36))
    .join('')
    .toUpperCase()
  return `00020126DEMO0014BR.GOV.BCB.PIX${aleatorio}5204000053039865802BR5920CAPELA N SRA LOURDES6304DEMO`
}

function formatarTempo(segundos: number): string {
  const minutos = Math.floor(segundos / 60)
  const resto = segundos % 60
  return `${minutos}:${String(resto).padStart(2, '0')}`
}

export function FazerDevolucaoPage() {
  const [mes, setMes] = React.useState(competenciaAtual())
  const [valor, setValor] = React.useState('')
  const [erro, setErro] = React.useState<string | null>(null)
  const [pix, setPix] = React.useState<{ modulos: boolean[][]; codigo: string } | null>(null)
  const [segundosRestantes, setSegundosRestantes] = React.useState(DURACAO_TIMER_SEGUNDOS)
  const [copiado, setCopiado] = React.useState(false)
  const timeoutCopiadoRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (!pix || segundosRestantes <= 0) return
    const intervalo = setInterval(() => setSegundosRestantes((s) => Math.max(s - 1, 0)), 1000)
    return () => clearInterval(intervalo)
  }, [pix, segundosRestantes])

  React.useEffect(() => {
    return () => {
      if (timeoutCopiadoRef.current) clearTimeout(timeoutCopiadoRef.current)
    }
  }, [])

  function gerarPix() {
    setPix({ modulos: gerarModulosQrFicticio(TAMANHO_QR), codigo: gerarCodigoPixFicticio() })
    setSegundosRestantes(DURACAO_TIMER_SEGUNDOS)
    setCopiado(false)
  }

  function handleGerar(event: React.FormEvent) {
    event.preventDefault()
    setErro(null)

    if (!mes) {
      setErro('Selecione o mês da devolução.')
      return
    }
    if (moedaParaNumero(valor) <= 0) {
      setErro('Informe um valor válido.')
      return
    }

    gerarPix()
  }

  function handleCopiar() {
    if (!pix) return
    navigator.clipboard.writeText(pix.codigo)
    toast.success('Código Pix copiado.')
    setCopiado(true)
    if (timeoutCopiadoRef.current) clearTimeout(timeoutCopiadoRef.current)
    timeoutCopiadoRef.current = setTimeout(() => setCopiado(false), DURACAO_COPIADO_MS)
  }

  function handleAlterarValor() {
    setPix(null)
  }

  const expirado = pix !== null && segundosRestantes <= 0

  return (
    <div>
      <PageHeader title="Devolver meu dízimo" description="Faça o pagamento com Pix da Capela, rápido e seguro." />

      <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-sm text-warning-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Ambiente de demonstração — o QR code e o código abaixo são fictícios, nenhum valor será cobrado.</p>
      </div>

      {!pix ? (
        <Card className="max-w-md">
          <CardContent>
            <form onSubmit={handleGerar} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="mes" className="text-base">
                  Mês da devolução
                </Label>
                <MesAnoPicker value={mes} onChange={setMes} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valor" className="text-base">
                  Valor
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="valor"
                    inputMode="numeric"
                    placeholder="0,00"
                    className="h-12 pl-10 text-base"
                    value={valor}
                    onChange={(e) => setValor(maskMoedaCentavos(e.target.value))}
                  />
                </div>
              </div>

              {erro && <p className="text-sm text-destructive">{erro}</p>}

              <Button type="submit" size="lg" className="w-full text-base">
                <QrCode className="h-5 w-5" />
                Gerar QR Code Pix
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-5 text-center">
            <Badge variant={expirado ? 'destructive' : segundosRestantes <= 60 ? 'warning' : 'muted'}>
              <Timer className="h-3.5 w-3.5" />
              {expirado ? 'Código expirado' : `Expira em ${formatarTempo(segundosRestantes)}`}
            </Badge>

            <svg
              viewBox={`0 0 ${TAMANHO_QR} ${TAMANHO_QR}`}
              role="img"
              aria-label="QR Code Pix de demonstração"
              className={`h-56 w-56 max-w-full rounded-lg border border-border bg-white p-2 ${expirado ? 'opacity-30' : ''}`}
            >
              {pix.modulos.map((linha, i) =>
                linha.map((preenchido, j) =>
                  preenchido ? <rect key={`${i}-${j}`} x={j} y={i} width={1} height={1} fill="#0f172a" /> : null,
                ),
              )}
            </svg>

            <div className="w-full space-y-1.5 text-left">
              <Label htmlFor="copia-cola" className="text-base">
                Pix copia e cola
              </Label>
              <Input id="copia-cola" readOnly value={pix.codigo} className="h-11 text-xs" />
            </div>

            <Button
              type="button"
              size="lg"
              className={cn('w-full text-base transition-colors', copiado && 'bg-success text-success-foreground hover:bg-success')}
              onClick={handleCopiar}
              disabled={expirado}
            >
              {copiado ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              {copiado ? 'Copiado!' : 'Copiar código Pix'}
            </Button>

            {!expirado && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Smartphone className="h-3.5 w-3.5 shrink-0" />
                Agora é só abrir o aplicativo do seu banco e colar o código Pix.
              </p>
            )}

            {expirado ? (
              <Button type="button" variant="outline" size="lg" className="w-full text-base" onClick={gerarPix}>
                <RefreshCw className="h-5 w-5" />
                Gerar novo código
              </Button>
            ) : (
              <Button type="button" variant="ghost" className="w-full" onClick={handleAlterarValor}>
                Alterar mês ou valor
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
