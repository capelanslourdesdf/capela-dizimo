import * as React from 'react'
import {
  Check,
  Copy,
  CreditCard,
  Info,
  Lock,
  QrCode,
  RefreshCw,
  Smartphone,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { SeletorMesesGrid } from '@/components/dashboard/SeletorMesesGrid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { useDizimistaSessao } from '@/hooks/useDizimistaSessao'
import { competenciaDaDevolucao, listarDevolucoes } from '@/services/devolucaoService'
import type { Devolucao } from '@/types'
import {
  formatCompetencia,
  maskCartao,
  maskCnpj,
  maskCpf,
  maskCvv,
  maskMoedaCentavos,
  maskValidade,
  moedaParaNumero,
} from '@/utils/format'

import iconePix from '@/assets/pagamento/pix-106.svg'
import iconeCartao from '@/assets/pagamento/credit-90.svg'
import logoMastercard from '@/assets/pagamento/mastercard-18.svg'
import logoVisa from '@/assets/pagamento/visa-17.svg'
import logoElo from '@/assets/pagamento/elo-30.svg'

type MetodoPagamento = 'pix' | 'cartao'
type TipoDocumento = 'cpf' | 'cnpj'

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

/** Barra que mostra uma escolha já feita (forma de pagamento, mês) com opção de voltar e alterá-la. */
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
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{label}</span>
      </div>
      <Button type="button" variant="link" size="sm" className="h-auto shrink-0 p-0" onClick={onAcao}>
        {acaoLabel}
      </Button>
    </div>
  )
}

/** Card de escolha da forma de pagamento — fundo branco, com o logo da forma correspondente. */
function CardMetodo({
  imagemSrc,
  titulo,
  descricao,
  onClick,
}: {
  imagemSrc: string
  titulo: string
  descricao: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-6 text-center shadow-sm transition-colors hover:border-primary hover:shadow-md"
    >
      <span className="flex h-14 items-center justify-center">
        <img src={imagemSrc} alt="" className="h-10 w-auto sm:h-12" />
      </span>
      <div>
        <p className="font-semibold text-slate-900">{titulo}</p>
        <p className="mt-1 text-xs text-slate-500">{descricao}</p>
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

  // Etapas do fluxo: forma de pagamento -> mês(es) -> valor (Pix) ou checkout (cartão).
  const [metodo, setMetodo] = React.useState<MetodoPagamento | null>(null)
  const [mesesSelecionados, setMesesSelecionados] = React.useState<Set<string>>(new Set())
  const [mesesConfirmados, setMesesConfirmados] = React.useState(false)

  const mesesOrdenados = React.useMemo(() => [...mesesSelecionados].sort(), [mesesSelecionados])
  const multiplosMeses = mesesOrdenados.length > 1

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
    setPix(null)
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
      toast.error('Informe um valor válido.')
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
  const [email, setEmail] = React.useState('')

  function handleTipoDocumento(valor: TipoDocumento) {
    setTipoDocumento(valor)
    setDocumento('')
  }

  function handlePagarCartao(event: React.FormEvent) {
    event.preventDefault()
    toast.info('Ambiente de demonstração — nenhum pagamento real será processado.')
  }

  return (
    <div>
      <PageHeader title="Devolver meu dízimo" description="Escolha a forma de pagamento e o mês da devolução." />

      <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-sm text-warning-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Ambiente de demonstração — nenhum valor será cobrado de verdade, em nenhuma das formas de pagamento.</p>
      </div>

      {!metodo ? (
        <div className="max-w-2xl">
          <p className="mb-4 text-base font-semibold text-foreground">Como deseja devolver?</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CardMetodo
              imagemSrc={iconePix}
              titulo="Pix"
              descricao="Pagamento instantâneo, com QR Code ou copia e cola."
              onClick={() => setMetodo('pix')}
            />
            <CardMetodo
              imagemSrc={iconeCartao}
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
                <CardTitle className="text-base">Selecione o mês (ou meses) da devolução</CardTitle>
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
                icon={Timer}
                label={`${multiplosMeses ? 'Meses selecionados' : 'Mês selecionado'}: ${mesesOrdenados.map(formatCompetencia).join(', ')}`}
                acaoLabel={multiplosMeses ? 'Alterar meses' : 'Alterar mês'}
                onAcao={handleAlterarMeses}
              />

              {metodo === 'pix' ? (
                !pix ? (
                  <Card>
                    <CardContent>
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
                        <Input id="copia-cola" readOnly value={pix.codigo} className="h-11 text-xs" />
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
                          Alterar valor
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              ) : (
                <Card className="bg-white">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base text-slate-900">Cartão de crédito ou débito</CardTitle>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {[logoMastercard, logoVisa, logoElo].map((logo) => (
                          <span
                            key={logo}
                            className="flex h-8 w-11 items-center justify-center rounded-md border border-border bg-white"
                          >
                            <img src={logo} alt="" className="h-4 w-auto" />
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePagarCartao} className="space-y-5" noValidate>
                      <div className="space-y-1.5">
                        <Label htmlFor="numeroCartao" className="text-slate-900">
                          Número do cartão
                        </Label>
                        <Input
                          id="numeroCartao"
                          inputMode="numeric"
                          placeholder="1234 1234 1234 1234"
                          value={numeroCartao}
                          onChange={(e) => setNumeroCartao(maskCartao(e.target.value))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="validadeCartao" className="text-slate-900">
                            Data de vencimento
                          </Label>
                          <Input
                            id="validadeCartao"
                            inputMode="numeric"
                            placeholder="mm/aa"
                            value={validadeCartao}
                            onChange={(e) => setValidadeCartao(maskValidade(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cvv" className="text-slate-900">
                            Código de segurança
                          </Label>
                          <div className="relative">
                            <Input
                              id="cvv"
                              inputMode="numeric"
                              placeholder="Ex.: 123"
                              className="pr-10"
                              value={cvv}
                              onChange={(e) => setCvv(maskCvv(e.target.value))}
                            />
                            <CreditCard className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="nomeTitular" className="text-slate-900">
                          Nome do titular como aparece no cartão
                        </Label>
                        <Input
                          id="nomeTitular"
                          placeholder="Maria Santos Pereira"
                          value={nomeTitular}
                          onChange={(e) => setNomeTitular(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="documento" className="text-slate-900">
                          Documento do titular
                        </Label>
                        <div className="flex items-center rounded-lg border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring">
                          <Select value={tipoDocumento} onValueChange={(v) => handleTipoDocumento(v as TipoDocumento)}>
                            <SelectTrigger className="h-11 w-[5.5rem] shrink-0 rounded-r-none border-0 border-r border-input shadow-none focus:ring-0">
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
                            placeholder={tipoDocumento === 'cpf' ? '999.999.999-99' : '99.999.999/9999-99'}
                            value={documento}
                            onChange={(e) =>
                              setDocumento(
                                tipoDocumento === 'cpf' ? maskCpf(e.target.value) : maskCnpj(e.target.value),
                              )
                            }
                            className="h-11 flex-1 rounded-l-none border-0 shadow-none focus-visible:ring-0"
                          />
                        </div>
                      </div>

                      <div className="border-t border-border pt-5">
                        <p className="mb-3 text-base font-semibold text-slate-900">Preencha seus dados</p>
                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-slate-900">
                            E-mail
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="exemplo@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
        </div>
      )}
    </div>
  )
}
