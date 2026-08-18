import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import type { DadosCadastraisDizimista, Dizimista } from '@/types'
import {
  buscarCarnePorNomeENascimento,
  buscarDizimistaPorCarne,
  gerarNumeroCarneDisponivel,
  type CandidatoCarne,
} from '@/services/dizimistaService'
import {
  dataBrEhValida,
  dataBrParaIso,
  dataIsoParaBr,
  diaMesEhValido,
  maskDataBr,
  maskDiaMes,
  maskTelefone,
} from '@/utils/format'
import { palavrasDoNome } from '@/utils/busca'
import { aguardarPeloMenos } from '@/utils/async'

/** Tempo mínimo (ms) que um spinner de busca fica visível, para não parecer estático. */
const DURACAO_MINIMA_LOADING_MS = 500

const dataNascimentoSchema = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use o formato dd/mm/aaaa.')
  .refine((valor) => dataBrEhValida(valor), 'Informe uma data válida.')

function createSchema(exigirCarne: boolean) {
  return z.object({
    numeroCarne: exigirCarne ? z.string().trim().min(1, 'Informe o número do carnê.') : z.string().optional(),
    sabeNumeroCarne: z.enum(['sim', 'nao']),
    nomeCompleto: z.string().min(3, 'Informe o nome completo.'),
    dataNascimento: dataNascimentoSchema,
    telefone: z.string().min(14, 'Informe um telefone válido.'),
  })
}

type FormValues = z.infer<ReturnType<typeof createSchema>>

/** Achata o objeto de erros do react-hook-form em caminhos ("nomeCompleto"). */
function caminhosComErro(erros: unknown, prefixo = ''): string[] {
  if (!erros || typeof erros !== 'object') return []
  if ('message' in (erros as Record<string, unknown>) && prefixo) return [prefixo]

  return Object.entries(erros as Record<string, unknown>).flatMap(([chave, valor]) =>
    caminhosComErro(valor, prefixo ? `${prefixo}.${chave}` : chave),
  )
}

/** Leva o usuário até o primeiro campo inválido. Os inputs usam `id` igual ao nome do campo. */
function irParaPrimeiroErro(erros: unknown) {
  const elementos = caminhosComErro(erros)
    .map((caminho) => document.getElementById(caminho))
    .filter((el): el is HTMLElement => !!el)

  if (elementos.length === 0) return

  const primeiro = elementos.reduce((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? b : a,
  )

  primeiro.scrollIntoView({ behavior: 'smooth', block: 'center' })
  // O foco vem depois da rolagem para não competir com ela em telas pequenas.
  window.setTimeout(() => primeiro.focus({ preventScroll: true }), 300)
}

interface RecadastramentoFormProps {
  dizimista?: Dizimista
  /** false no cadastro feito pelo admin: o nº do carnê é gerado ao salvar, não informado no form. */
  exibirCarne?: boolean
  bloquearCarne?: boolean
  /** true no recadastramento público: após salvar, limpa tudo para permitir outro em seguida. */
  limparAposSalvar?: boolean
  onSalvar: (
    dados: DadosCadastraisDizimista,
    numeroCarneInformado: string,
    opcoes?: { carneGeradoPeloSite?: boolean },
  ) => Promise<void>
}

/** Monta os valores do formulário a partir de um dizimista existente, ou em branco (novo). */
function valoresDoFormulario(dizimista?: Dizimista): FormValues {
  return {
    numeroCarne: dizimista?.numeroCarne ?? '',
    sabeNumeroCarne: 'sim',
    nomeCompleto: dizimista?.nomeCompleto ?? '',
    dataNascimento: dizimista?.dataNascimento ? dataIsoParaBr(dizimista.dataNascimento) : '',
    telefone: dizimista?.telefone ?? '',
  }
}

export function RecadastramentoForm({
  dizimista,
  exibirCarne = true,
  bloquearCarne = false,
  limparAposSalvar = false,
  onSalvar,
}: RecadastramentoFormProps) {
  const [erro, setErro] = React.useState<string | null>(null)
  const schema = React.useMemo(() => createSchema(exibirCarne), [exibirCarne])

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: valoresDoFormulario(dizimista),
  })

  /**
   * Registra um campo de texto normalizando para MAIÚSCULAS enquanto o usuário digita, para que
   * os dados fiquem uniformes na base.
   */
  function registrarMaiusculo(nome: Parameters<typeof register>[0]) {
    const campo = register(nome)
    return {
      ...campo,
      onChange: (evento: { target: HTMLInputElement; type?: unknown }) => {
        evento.target.value = evento.target.value.toUpperCase()
        return campo.onChange(evento)
      },
    }
  }

  const numeroCarneDigitado = watch('numeroCarne')
  const sabeNumeroCarne = watch('sabeNumeroCarne')
  const [buscandoCarne, setBuscandoCarne] = React.useState(false)
  const [gerandoCarne, setGerandoCarne] = React.useState(false)
  const [statusCarne, setStatusCarne] = React.useState<'encontrado' | 'novo' | 'gerado' | null>(null)

  // Busca do carnê por nome + dia/mês de nascimento (opção "não sei o número").
  const [nomeBusca, setNomeBusca] = React.useState('')
  const [diaMesBusca, setDiaMesBusca] = React.useState('')
  const [buscandoPorNome, setBuscandoPorNome] = React.useState(false)
  const [erroBusca, setErroBusca] = React.useState<string | null>(null)
  const [candidatos, setCandidatos] = React.useState<CandidatoCarne[] | null>(null)
  const [buscaSemResultado, setBuscaSemResultado] = React.useState(false)

  // Só busca no fluxo público de recadastramento: no cadastro pelo admin o carnê ainda não
  // existe (é gerado ao salvar) e na edição os dados já vêm prontos via prop `dizimista`.
  const deveBuscarPorCarne = exibirCarne && !bloquearCarne && sabeNumeroCarne === 'sim'
  const ultimoCarneBuscado = React.useRef<string | null>(null)

  function handleMudarSabeNumero(valor: 'sim' | 'nao') {
    setValue('sabeNumeroCarne', valor)
    ultimoCarneBuscado.current = null
    setStatusCarne(null)
    setErro(null)
    setCandidatos(null)
    setBuscaSemResultado(false)

    if (valor === 'sim') {
      setValue('numeroCarne', '', { shouldValidate: false })
    }
  }

  /** Preenche o formulário com os dados de um dizimista já cadastrado. */
  const preencherCom = React.useCallback(
    (encontrado: Dizimista) => {
      ultimoCarneBuscado.current = encontrado.numeroCarne
      reset({
        ...getValues(),
        numeroCarne: encontrado.numeroCarne,
        nomeCompleto: encontrado.nomeCompleto,
        dataNascimento: dataIsoParaBr(encontrado.dataNascimento),
        telefone: encontrado.telefone ?? '',
      })
      setStatusCarne('encontrado')
      setCandidatos(null)
      setBuscaSemResultado(false)
    },
    [reset, getValues],
  )

  /** Gera um carnê novo (até 5 dígitos, a partir de 500) ainda livre na base. */
  async function gerarNovoCarne() {
    setErro(null)
    setGerandoCarne(true)
    try {
      const gerado = await gerarNumeroCarneDisponivel()
      setValue('numeroCarne', gerado, { shouldValidate: true })
      setStatusCarne('gerado')
      setCandidatos(null)
      setBuscaSemResultado(false)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível gerar um número de carnê.')
    } finally {
      setGerandoCarne(false)
    }
  }

  async function handleBuscarCarne() {
    const nome = nomeBusca.trim()

    if (nome.length < 3) {
      setErroBusca('Informe o nome completo.')
      return
    }
    if (!diaMesEhValido(diaMesBusca)) {
      setErroBusca('Informe o dia e o mês de nascimento no formato dd/mm.')
      return
    }

    setErroBusca(null)
    setBuscaSemResultado(false)
    setCandidatos(null)
    setBuscandoPorNome(true)
    const inicio = Date.now()

    try {
      const encontrados = await buscarCarnePorNomeENascimento(nome, diaMesBusca)
      await aguardarPeloMenos(inicio, DURACAO_MINIMA_LOADING_MS)

      // Um único candidato forte e com a data conferindo: assume sem perguntar. Com apenas um
      // nome informado ("MARIA") o risco de pegar a pessoa errada é alto, então sempre confirma.
      const unicoCerteiro =
        encontrados.length === 1 &&
        encontrados[0].nascimentoConfere &&
        encontrados[0].pontuacaoNome >= 0.85 &&
        palavrasDoNome(nome).length >= 2

      if (unicoCerteiro) {
        preencherCom(encontrados[0].dizimista)
        return
      }

      if (encontrados.length === 0) {
        setBuscaSemResultado(true)
        await gerarNovoCarne()
        setBuscaSemResultado(true)
        return
      }

      setCandidatos(encontrados)
    } catch {
      setErroBusca('Não foi possível consultar agora. Tente novamente.')
    } finally {
      setBuscandoPorNome(false)
    }
  }

  React.useEffect(() => {
    if (!deveBuscarPorCarne) return

    const carne = (numeroCarneDigitado ?? '').trim()
    if (!carne) {
      setStatusCarne(null)
      ultimoCarneBuscado.current = null
      return
    }
    if (carne === ultimoCarneBuscado.current) return

    let cancelado = false
    const timer = setTimeout(async () => {
      setBuscandoCarne(true)
      const inicio = Date.now()
      const encontrado = await buscarDizimistaPorCarne(carne).catch(() => null)
      await aguardarPeloMenos(inicio, DURACAO_MINIMA_LOADING_MS)
      if (cancelado) return

      ultimoCarneBuscado.current = carne
      setBuscandoCarne(false)

      if (!encontrado) {
        setStatusCarne('novo')
        return
      }

      setStatusCarne('encontrado')
      reset({
        ...getValues(),
        numeroCarne: carne,
        nomeCompleto: encontrado.nomeCompleto,
        dataNascimento: dataIsoParaBr(encontrado.dataNascimento),
        telefone: encontrado.telefone ?? '',
      })
    }, 600)

    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [numeroCarneDigitado, deveBuscarPorCarne, reset, getValues])

  const campoDataNascimento = (
    <div className="space-y-1.5">
      <Label htmlFor="dataNascimento">Data de nascimento</Label>
      <Controller
        control={control}
        name="dataNascimento"
        render={({ field }) => (
          <Input
            id="dataNascimento"
            inputMode="numeric"
            placeholder="dd/mm/aaaa"
            value={field.value}
            onChange={(e) => field.onChange(maskDataBr(e.target.value))}
          />
        )}
      />
      {errors.dataNascimento && <p className="text-xs text-destructive">{errors.dataNascimento.message}</p>}
    </div>
  )

  async function onSubmit(values: FormValues) {
    setErro(null)
    try {
      // Reforço no envio: garante MAIÚSCULAS mesmo em valores colados ou preenchidos pelo
      // autocompletar do navegador, que não passam pelo onChange dos campos.
      const emMaiusculas = (valor?: string) => (valor ?? '').trim().toUpperCase()

      const dados: DadosCadastraisDizimista = {
        nomeCompleto: emMaiusculas(values.nomeCompleto),
        dataNascimento: dataBrParaIso(values.dataNascimento),
        telefone: values.telefone,
      }

      await onSalvar(dados, (values.numeroCarne ?? '').trim(), {
        carneGeradoPeloSite: values.sabeNumeroCarne === 'nao' && statusCarne === 'gerado',
      })

      if (limparAposSalvar) {
        reset(valoresDoFormulario())
        ultimoCarneBuscado.current = null
        setStatusCarne(null)
        setNomeBusca('')
        setDiaMesBusca('')
        setErroBusca(null)
        setCandidatos(null)
        setBuscaSemResultado(false)
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, irParaPrimeiroErro)} noValidate className="space-y-6">
      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground mt-4">Dados do dizimista</h2>

        {exibirCarne && !bloquearCarne && (
          <RadioGroup
            value={sabeNumeroCarne}
            onValueChange={(v) => handleMudarSabeNumero(v as 'sim' | 'nao')}
            className="grid-cols-1 sm:grid-cols-2"
          >
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-input px-3.5 py-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
              <RadioGroupItem value="sim" />
              Já tenho o número do carnê
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-input px-3.5 py-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
              <RadioGroupItem value="nao" />
              Não sei o número do carnê
            </label>
          </RadioGroup>
        )}

        {exibirCarne && !bloquearCarne && sabeNumeroCarne === 'nao' && statusCarne === null && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-4 py-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Vamos procurar seu carnê</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Informe o nome do dizimista e o mês/ano de nascimento para localizarmos o cadastro.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nomeBusca">Nome do dizimista</Label>
                <Input
                  id="nomeBusca"
                  placeholder="Nome completo"
                  value={nomeBusca}
                  onChange={(e) => setNomeBusca(e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="diaMesBusca">Dia e mês de nascimento</Label>
                <Input
                  id="diaMesBusca"
                  inputMode="numeric"
                  placeholder="dd/mm"
                  className="sm:max-w-[10rem]"
                  value={diaMesBusca}
                  onChange={(e) => setDiaMesBusca(maskDiaMes(e.target.value))}
                />
              </div>

              {erroBusca && <p className="text-xs text-destructive">{erroBusca}</p>}

              {candidatos && candidatos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Encontramos mais de uma possibilidade. Selecione o cadastro correto:
                  </p>
                  {candidatos.map(({ dizimista: d, nascimentoConfere }) => (
                    <button
                      key={d.numeroCarne}
                      type="button"
                      onClick={() => preencherCom(d)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-input bg-background px-3.5 py-2.5 text-left text-sm hover:border-primary hover:bg-primary/5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{d.nomeCompleto}</span>
                        <span className="block text-xs text-muted-foreground">
                          Carnê nº {d.numeroCarne}
                          {!nascimentoConfere && ' · nascimento não confere'}
                        </span>
                      </span>
                    </button>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={gerarNovoCarne} disabled={gerandoCarne}>
                    Nenhum destes — gerar um número novo
                  </Button>
                </div>
              )}

              <Button type="button" className="w-full" onClick={handleBuscarCarne} disabled={buscandoPorNome}>
                {buscandoPorNome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {buscandoPorNome ? 'Procurando...' : 'Buscar número'}
              </Button>
            </CardContent>
          </Card>
        )}

        {exibirCarne && (bloquearCarne || sabeNumeroCarne === 'sim' || statusCarne !== null) && (
          <div className="space-y-1.5">
            <Label htmlFor="numeroCarne">Nº do carnê</Label>
            <div className="relative">
              <Input
                id="numeroCarne"
                inputMode="numeric"
                placeholder="Número impresso no carnê"
                disabled={bloquearCarne || sabeNumeroCarne === 'nao'}
                className={buscandoCarne || gerandoCarne ? 'pr-9' : undefined}
                {...register('numeroCarne')}
              />
              {(buscandoCarne || gerandoCarne) && (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </span>
              )}
            </div>
            {errors.numeroCarne && <p className="text-xs text-destructive">{errors.numeroCarne.message}</p>}
            {!errors.numeroCarne && !buscandoCarne && statusCarne === 'encontrado' && (
              <p className="text-xs text-success">
                Carnê encontrado! Confira os dados abaixo e atualize o que for necessário.
              </p>
            )}
            {!errors.numeroCarne && !buscandoCarne && statusCarne === 'novo' && (
              <p className="text-xs text-muted-foreground">
                Nenhum cadastro encontrado para este carnê — preencha os dados abaixo.
              </p>
            )}
            {!errors.numeroCarne && !gerandoCarne && statusCarne === 'gerado' && (
              <p className={buscaSemResultado ? 'text-sm font-semibold text-success' : 'text-xs text-success'}>
                {buscaSemResultado
                  ? 'Não encontramos um cadastro com esses dados — mas não se preocupe: geramos um novo número de carnê. Anote-o, é com ele que se acessa o site.'
                  : 'Anote este número: ele será usado para acompanhar o dízimo.'}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="nomeCompleto">Nome completo</Label>
          <Input id="nomeCompleto" autoComplete="name" {...registrarMaiusculo('nomeCompleto')} />
          {errors.nomeCompleto && <p className="text-xs text-destructive">{errors.nomeCompleto.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {campoDataNascimento}
          <div className="space-y-1.5">
            <Label htmlFor="telefone">Telefone/WhatsApp</Label>
            <Controller
              control={control}
              name="telefone"
              render={({ field }) => (
                <Input
                  id="telefone"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={field.value}
                  onChange={(e) => field.onChange(maskTelefone(e.target.value))}
                />
              )}
            />
            {errors.telefone && <p className="text-xs text-destructive">{errors.telefone.message}</p>}
          </div>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        <Save className="h-4 w-4" />
        {isSubmitting ? 'Salvando...' : 'Salvar dados'}
      </Button>
    </form>
  )
}
