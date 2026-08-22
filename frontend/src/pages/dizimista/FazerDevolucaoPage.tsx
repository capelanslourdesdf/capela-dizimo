import * as React from 'react'
import {
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  Info,
  Lock,
  QrCode,
  RefreshCw,
  Smartphone,
  Timer,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { SeletorMesesGrid } from '@/components/dashboard/SeletorMesesGrid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { useDizimistaSessao } from '@/hooks/useDizimistaSessao'
import { competenciaDaDevolucao, listarDevolucoes } from '@/services/devolucaoService'
import type { Devolucao } from '@/types'
import {
  formatCompetencia,
  formatCurrency,
  maskCartao,
  maskCnpj,
  maskCpf,
  maskCvv,
  maskMoedaCentavos,
  maskValidade,
  moedaParaNumero,
} from '@/utils/format'

import iconeCartao from '@/assets/pagamento/credit-90.svg'
import logoMastercard from '@/assets/pagamento/mastercard-18.svg'
import logoVisa from '@/assets/pagamento/visa-17.svg'
import logoElo from '@/assets/pagamento/elo-30.svg'

type MetodoPagamento = 'pix' | 'cartao'
type TipoDocumento = 'cpf' | 'cnpj'
type ModoValorMultiplo = 'distribuir' | 'mesmo'

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

/** Toast de erro vermelho com letra branca — independe de qualquer classe do Toaster global. */
function toastErro(mensagem: string) {
  toast.error(mensagem, {
    style: {
      background: 'hsl(var(--destructive))',
      color: 'hsl(var(--destructive-foreground))',
      border: '1px solid hsl(var(--destructive))',
    },
  })
}

/** Logo do Pix — embutido como SVG (sem depender de arquivo de imagem). */
function IconePix({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={className} aria-hidden="true">
      <path
        fill="#37c6d0"
        d="M306.4 356.5C311.8 351.1 321.1 351.1 326.5 356.5L403.5 433.5C417.7 447.7 436.6 455.5 456.6 455.5L471.7 455.5L374.6 552.6C344.3 582.1 295.1 582.1 264.8 552.6L167.3 455.2L176.6 455.2C196.6 455.2 215.5 447.4 229.7 433.2L306.4 356.5zM326.5 282.9C320.1 288.4 311.9 288.5 306.4 282.9L229.7 206.2C215.5 191.1 196.6 184.2 176.6 184.2L167.3 184.2L264.7 86.8C295.1 56.5 344.3 56.5 374.6 86.8L471.8 183.9L456.6 183.9C436.6 183.9 417.7 191.7 403.5 205.9L326.5 282.9zM176.6 206.7C190.4 206.7 203.1 212.3 213.7 222.1L290.4 298.8C297.6 305.1 307 309.6 316.5 309.6C325.9 309.6 335.3 305.1 342.5 298.8L419.5 221.8C429.3 212.1 442.8 206.5 456.6 206.5L494.3 206.5L552.6 264.8C582.9 295.1 582.9 344.3 552.6 374.6L494.3 432.9L456.6 432.9C442.8 432.9 429.3 427.3 419.5 417.5L342.5 340.5C328.6 326.6 304.3 326.6 290.4 340.6L213.7 417.2C203.1 427 190.4 432.6 176.6 432.6L144.8 432.6L86.8 374.6C56.5 344.3 56.5 295.1 86.8 264.8L144.8 206.7L176.6 206.7z"
      />
    </svg>
  )
}

/**
 * Barra que mostra uma escolha já feita (forma de pagamento, mês, valor). O card inteiro é
 * clicável — tocar em qualquer parte já dispara a mesma ação de alterar, não só o link de texto.
 * O rótulo da escolha e o link de "alterar" ficam empilhados (em vez de lado a lado) pra não
 * cortar a lista de meses quando são vários selecionados.
 */
function FaixaFixada({
  icon: Icon,
  label,
  acaoLabel,
  onAcao,
}: {
  icon: LucideIcon
  label: string
  acaoLabel: string
  onAcao: () => void
}) {
  return (
    <button
      type="button"
      onClick={onAcao}
      className="mb-5 flex w-full flex-col gap-1 rounded-lg border border-border bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/50"
    >
      <span className="flex items-start gap-2 text-base font-medium text-foreground">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <span>{label}</span>
      </span>
      <span className="pl-7 text-sm font-medium text-primary">{acaoLabel}</span>
    </button>
  )
}

/** Card de escolha da forma de pagamento — fundo branco, com o ícone da forma correspondente. */
function CardMetodo({
  icon,
  titulo,
  descricao,
  onClick,
}: {
  icon: React.ReactNode
  titulo: string
  descricao: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-4 text-center shadow-sm transition-colors hover:border-primary hover:shadow-md sm:gap-3 sm:p-6"
    >
      <span className="flex h-14 items-center justify-center">{icon}</span>
      <div>
        <p className="text-base font-semibold text-slate-900 sm:text-lg">{titulo}</p>
        <p className="mt-1 hidden text-sm text-slate-500 sm:block">{descricao}</p>
      </div>
    </button>
  )
}

export function FazerDevolucaoPage() {
  const { numeroCarne } = useDizimistaSessao()
  const [devolucoes, setDevolucoes] = React.useState<Devolucao[]>([])

  React.useEffect(() => {
    if (!numeroCarne) return
    listarDevolucoes(numeroCarne).then(setDevolucoes)
  }, [numeroCarne])

  const competenciasPagas = React.useMemo(() => new Set(devolucoes.map(competenciaDaDevolucao)), [devolucoes])
  const anoAtual = new Date().getFullYear()

  // Etapas do fluxo: forma de pagamento -> mês(es) -> valor (se mais de um mês) -> Pix ou cartão.
  const [metodo, setMetodo] = React.useState<MetodoPagamento | null>(null)
  const [mesesSelecionados, setMesesSelecionados] = React.useState<Set<string>>(new Set())
  const [mesesConfirmados, setMesesConfirmados] = React.useState(false)

  const mesesOrdenados = React.useMemo(() => [...mesesSelecionados].sort(), [mesesSelecionados])
  const multiplosMeses = mesesOrdenados.length > 1

  // ------------------------------------------------------ Valor entre vários meses
  const [modoValorMultiplo, setModoValorMultiplo] = React.useState<ModoValorMultiplo | null>(null)
  const [valorMultiplo, setValorMultiplo] = React.useState('')
  const [valorMultiploConfirmado, setValorMultiploConfirmado] = React.useState(false)

  const valorMultiploNumerico = moedaParaNumero(valorMultiplo)

  const valoresPorMes = React.useMemo(() => {
    const mapa = new Map<string, number>()
    if (!modoValorMultiplo || valorMultiploNumerico <= 0 || mesesOrdenados.length === 0) return mapa

    if (modoValorMultiplo === 'mesmo') {
      mesesOrdenados.forEach((c) => mapa.set(c, valorMultiploNumerico))
      return mapa
    }

    // Distribuir: divide em centavos pra não perder nem sobrar centavo por arredondamento — o
    // resto da divisão vai pros primeiros meses (ordem cronológica), um centavo a mais cada.
    const totalCentavos = Math.round(valorMultiploNumerico * 100)
    const quantidade = mesesOrdenados.length
    const baseCentavos = Math.floor(totalCentavos / quantidade)
    const resto = totalCentavos - baseCentavos * quantidade
    mesesOrdenados.forEach((c, indice) => mapa.set(c, (baseCentavos + (indice < resto ? 1 : 0)) / 100))
    return mapa
  }, [modoValorMultiplo, valorMultiploNumerico, mesesOrdenados])

  const subtotalMultiplo = React.useMemo(
    () => [...valoresPorMes.values()].reduce((soma, v) => soma + v, 0),
    [valoresPorMes],
  )

  const precisaConfirmarValorMultiplo = multiplosMeses && !valorMultiploConfirmado

  function handleAlternarMes(competencia: string) {
    setMesesSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(competencia)) novo.delete(competencia)
      else novo.add(competencia)
      return novo
    })
  }

  function handleAlterarMetodo() {
    setMetodo(null)
  }

  function handleAlterarMeses() {
    setMesesConfirmados(false)
    setModoValorMultiplo(null)
    setValorMultiplo('')
    setValorMultiploConfirmado(false)
    setPix(null)
  }

  function handleAlterarValorMultiplo() {
    setValorMultiploConfirmado(false)
    setPix(null)
  }

  function handleEscolherModoValor(modo: ModoValorMultiplo) {
    setModoValorMultiplo(modo)
    setValorMultiplo('')
  }

  function handleConfirmarValorMultiplo() {
    if (subtotalMultiplo <= 0) {
      toastErro('Informe um valor válido.')
      return
    }
    setValorMultiploConfirmado(true)
  }

  // ---------------------------------------------------------------- Pix
  const [valor, setValor] = React.useState('')
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

  function handleGerarPix(event: React.FormEvent) {
    event.preventDefault()
    if (moedaParaNumero(valor) <= 0) {
      toastErro('Informe um valor válido.')
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

  // ---------------------------------------------------------------- Cartão
  const [numeroCartao, setNumeroCartao] = React.useState('')
  const [validadeCartao, setValidadeCartao] = React.useState('')
  const [cvv, setCvv] = React.useState('')
  const [nomeTitular, setNomeTitular] = React.useState('')
  const [tipoDocumento, setTipoDocumento] = React.useState<TipoDocumento>('cpf')
  const [documento, setDocumento] = React.useState('')
  const [cartaoAprovado, setCartaoAprovado] = React.useState(false)

  function handleTipoDocumento(valor: TipoDocumento) {
    setTipoDocumento(valor)
    setDocumento('')
  }

  function handlePagarCartao(event: React.FormEvent) {
    event.preventDefault()

    // Mock de teste: qualquer preenchimento nos campos já aprova — sem validação de verdade,
    // sem integração nenhuma.
    const preenchido =
      numeroCartao.trim() && validadeCartao.trim() && cvv.trim() && nomeTitular.trim() && documento.trim()

    if (!preenchido) {
      toastErro('Preencha todos os campos do cartão.')
      return
    }

    setCartaoAprovado(true)
  }

  function handleReiniciarFluxo() {
    setMetodo(null)
    setMesesSelecionados(new Set())
    setMesesConfirmados(false)
    setModoValorMultiplo(null)
    setValorMultiplo('')
    setValorMultiploConfirmado(false)
    setValor('')
    setPix(null)
    setNumeroCartao('')
    setValidadeCartao('')
    setCvv('')
    setNomeTitular('')
    setTipoDocumento('cpf')
    setDocumento('')
    setCartaoAprovado(false)
  }

  return (
    <div>
      <PageHeader title="Devolver meu dízimo" description="Escolha a forma de pagamento e o mês da devolução." />

      <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-base text-warning-foreground">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Ambiente de demonstração — nenhum valor será cobrado de verdade, em nenhuma das formas de pagamento.</p>
      </div>

      {!metodo ? (
        <div className="max-w-2xl">
          <p className="mb-4 text-lg font-semibold text-foreground">Como deseja devolver?</p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <CardMetodo
              icon={<IconePix className="h-14 w-14 sm:h-14 sm:w-14" />}
              titulo="Pix"
              descricao="Pagamento instantâneo, com QR Code ou copia e cola."
              onClick={() => setMetodo('pix')}
            />
            <CardMetodo
              icon={<img src={iconeCartao} alt="" className="h-14 w-auto sm:h-14" />}
              titulo="Cartão de crédito ou débito"
              descricao="Pague com o cartão em poucos passos."
              onClick={() => setMetodo('cartao')}
            />
          </div>
        </div>
      ) : (
        <div className="max-w-md">
          <FaixaFixada
            icon={metodo === 'pix' ? QrCode : CreditCard}
            label={metodo === 'pix' ? 'Pix' : 'Cartão de crédito ou débito'}
            acaoLabel="Alterar forma de pagamento"
            onAcao={handleAlterarMetodo}
          />

          {!mesesConfirmados ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selecione o mês (ou meses) da devolução</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <SeletorMesesGrid
                  ano={anoAtual}
                  competenciasPagas={competenciasPagas}
                  selecionados={mesesSelecionados}
                  onAlternar={handleAlternarMes}
                />
                <Button
                  type="button"
                  size="lg"
                  className="w-full text-base"
                  disabled={mesesSelecionados.size === 0}
                  onClick={() => setMesesConfirmados(true)}
                >
                  Continuar
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <FaixaFixada
                icon={CalendarDays}
                label={`${multiplosMeses ? 'Meses selecionados' : 'Mês selecionado'}: ${mesesOrdenados.map(formatCompetencia).join(', ')}`}
                acaoLabel={multiplosMeses ? 'Alterar meses' : 'Alterar mês'}
                onAcao={handleAlterarMeses}
              />

              {precisaConfirmarValorMultiplo ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Valor da devolução</CardTitle>
                    <CardDescription className="text-sm">
                      Você escolheu {mesesOrdenados.length} meses — escolha uma opção:
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant={modoValorMultiplo === 'distribuir' ? 'default' : 'outline'}
                        className="h-auto whitespace-normal py-3 text-sm"
                        onClick={() => handleEscolherModoValor('distribuir')}
                      >
                        Dividir o valor entre os meses
                      </Button>
                      <Button
                        type="button"
                        variant={modoValorMultiplo === 'mesmo' ? 'default' : 'outline'}
                        className="h-auto whitespace-normal py-3 text-sm"
                        onClick={() => handleEscolherModoValor('mesmo')}
                      >
                        Devolver o mesmo valor para cada mês
                      </Button>
                    </div>

                    {modoValorMultiplo && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="valorMultiplo" className="text-base">
                            {modoValorMultiplo === 'distribuir' ? 'Valor total a distribuir' : 'Valor de cada mês'}
                          </Label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                              R$
                            </span>
                            <Input
                              id="valorMultiplo"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="0,00"
                              className="h-12 pl-10 text-base"
                              value={valorMultiplo}
                              onChange={(e) => setValorMultiplo(maskMoedaCentavos(e.target.value))}
                            />
                          </div>
                        </div>

                        {valoresPorMes.size > 0 && (
                          <div className="overflow-hidden rounded-lg border border-border">
                            <div className="divide-y divide-border">
                              {mesesOrdenados.map((c) => (
                                <div key={c} className="flex items-center justify-between px-4 py-2.5 text-base">
                                  <span className="text-foreground">{formatCompetencia(c)}</span>
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(valoresPorMes.get(c) ?? 0)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between bg-muted/40 px-4 py-3 text-base font-semibold text-foreground">
                              <span>Subtotal</span>
                              <span>{formatCurrency(subtotalMultiplo)}</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <Button
                      type="button"
                      size="lg"
                      className="w-full text-base"
                      disabled={!modoValorMultiplo}
                      onClick={handleConfirmarValorMultiplo}
                    >
                      Continuar
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {multiplosMeses && (
                    <FaixaFixada
                      icon={Wallet}
                      label={`Valor: ${formatCurrency(subtotalMultiplo)}`}
                      acaoLabel="Alterar valor"
                      onAcao={handleAlterarValorMultiplo}
                    />
                  )}

                  {metodo === 'pix' ? (
                    !pix ? (
                      <Card>
                        <CardContent>
                          {multiplosMeses ? (
                            <div className="space-y-5">
                              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                                <span className="text-base font-medium text-foreground">Total a pagar</span>
                                <span className="text-lg font-semibold text-foreground">
                                  {formatCurrency(subtotalMultiplo)}
                                </span>
                              </div>
                              <Button type="button" size="lg" className="w-full text-base" onClick={gerarPix}>
                                <QrCode className="h-5 w-5" />
                                Gerar QR Code Pix
                              </Button>
                            </div>
                          ) : (
                            <form onSubmit={handleGerarPix} className="space-y-5" noValidate>
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
                                    pattern="[0-9]*"
                                    placeholder="0,00"
                                    className="h-12 pl-10 text-base"
                                    value={valor}
                                    onChange={(e) => setValor(maskMoedaCentavos(e.target.value))}
                                  />
                                </div>
                              </div>

                              <Button type="submit" size="lg" className="w-full text-base">
                                <QrCode className="h-5 w-5" />
                                Gerar QR Code Pix
                              </Button>
                            </form>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
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
                                preenchido ? (
                                  <rect key={`${i}-${j}`} x={j} y={i} width={1} height={1} fill="#0f172a" />
                                ) : null,
                              ),
                            )}
                          </svg>

                          <div className="w-full space-y-1.5 text-left">
                            <Label htmlFor="copia-cola" className="text-base">
                              Pix copia e cola
                            </Label>
                            <Input id="copia-cola" readOnly value={pix.codigo} className="h-11 text-sm" />
                          </div>

                          <Button
                            type="button"
                            size="lg"
                            className={cn(
                              'w-full text-base transition-colors',
                              copiado && 'bg-success text-success-foreground hover:bg-success',
                            )}
                            onClick={handleCopiar}
                            disabled={expirado}
                          >
                            {copiado ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                            {copiado ? 'Copiado!' : 'Copiar código Pix'}
                          </Button>

                          {!expirado && (
                            <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                              <Smartphone className="h-4 w-4 shrink-0" />
                              Agora é só abrir o aplicativo do seu banco e colar o código Pix.
                            </p>
                          )}

                          {expirado ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="lg"
                              className="w-full text-base"
                              onClick={gerarPix}
                            >
                              <RefreshCw className="h-5 w-5" />
                              Gerar novo código
                            </Button>
                          ) : (
                            <Button type="button" variant="ghost" className="w-full text-base" onClick={handleAlterarValor}>
                              Alterar valor
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )
                  ) : cartaoAprovado ? (
                    <Card className="bg-white">
                      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
                          <Check className="h-8 w-8" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-900">Pagamento aprovado!</p>
                          {multiplosMeses && (
                            <p className="mt-1 text-base text-slate-500">
                              {formatCurrency(subtotalMultiplo)} referente a {mesesOrdenados.length} meses.
                            </p>
                          )}
                        </div>
                        <Button type="button" variant="outline" className="w-full text-base" onClick={handleReiniciarFluxo}>
                          Fazer nova devolução
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-white">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-lg text-slate-900">Cartão de crédito ou débito</CardTitle>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {[logoMastercard, logoVisa, logoElo].map((logo, index) => (
                              <span
                                key={logo}
                                className="flex h-8 w-11 items-center justify-center rounded-md border border-border bg-white"
                              >
                                {index === 0 && <img src={logo} alt="" className="h-5 w-auto" />}
                                {index === 1 && <img src={logo} alt="" className="h-3 w-auto" />}
                                {index === 2 && <img src={logo} alt="" className="h-4 w-auto" />}
                              </span>
                            ))}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {multiplosMeses && (
                          <div className="mb-5 flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                            <span className="text-base font-medium text-slate-900">Total a pagar</span>
                            <span className="text-lg font-semibold text-slate-900">
                              {formatCurrency(subtotalMultiplo)}
                            </span>
                          </div>
                        )}
                        <form onSubmit={handlePagarCartao} className="space-y-5" noValidate>
                          <div className="space-y-1.5">
                            <Label htmlFor="numeroCartao" className="text-base text-slate-900">
                              Número do cartão
                            </Label>
                            <Input
                              id="numeroCartao"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="0000 0000 0000 0000"
                              className="text-base"
                              value={numeroCartao}
                              onChange={(e) => setNumeroCartao(maskCartao(e.target.value))}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="validadeCartao" className="text-base text-slate-900">
                                Data de vencimento
                              </Label>
                              <Input
                                id="validadeCartao"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="mm/aa"
                                className="text-base"
                                value={validadeCartao}
                                onChange={(e) => setValidadeCartao(maskValidade(e.target.value))}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="cvv" className="text-base text-slate-900">
                                Código de segurança (CVV)
                              </Label>
                              <div className="relative">
                                <Input
                                  id="cvv"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="Ex.: 123"
                                  className="pr-10 text-base"
                                  value={cvv}
                                  onChange={(e) => setCvv(maskCvv(e.target.value))}
                                />
                                <CreditCard className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="nomeTitular" className="text-base text-slate-900">
                              Nome do titular como aparece no cartão
                            </Label>
                            <Input
                              id="nomeTitular"
                              className="text-base"
                              value={nomeTitular}
                              onChange={(e) => setNomeTitular(e.target.value.toUpperCase())}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="documento" className="text-base text-slate-900">
                              Documento do titular
                            </Label>
                            <div className="flex items-center rounded-lg border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring">
                              <Select value={tipoDocumento} onValueChange={(v) => handleTipoDocumento(v as TipoDocumento)}>
                                <SelectTrigger className="h-11 w-[5.5rem] shrink-0 rounded-r-none border-0 border-r border-input text-base shadow-none focus:ring-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cpf">CPF</SelectItem>
                                  <SelectItem value="cnpj">CNPJ</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                id="documento"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder={tipoDocumento === 'cpf' ? '000.000.000-00' : '00.000.000/0001-00'}
                                value={documento}
                                onChange={(e) =>
                                  setDocumento(
                                    tipoDocumento === 'cpf' ? maskCpf(e.target.value) : maskCnpj(e.target.value),
                                  )
                                }
                                className="h-11 flex-1 rounded-l-none border-0 text-base shadow-none focus-visible:ring-0"
                              />
                            </div>
                          </div>

                          <Button type="submit" size="lg" className="w-full text-base">
                            <Lock className="h-4 w-4" />
                            Pagar
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
