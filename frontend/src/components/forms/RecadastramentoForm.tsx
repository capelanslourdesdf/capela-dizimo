import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import type { DadosCadastraisDizimista, Dizimista } from '@/types'
import { buscarDizimistaPorCarne, gerarNumeroCarneDisponivel } from '@/services/dizimistaService'
import { dataBrEhValida, dataBrParaIso, dataIsoParaBr, maskDataBr, maskTelefone } from '@/utils/format'
import { aguardarPeloMenos } from '@/utils/async'

/** Tempo mínimo (ms) que um spinner de busca fica visível, para não parecer estático. */
const DURACAO_MINIMA_LOADING_MS = 500

const dataNascimentoSchema = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use o formato dd/mm/aaaa.')
  .refine((valor) => dataBrEhValida(valor), 'Informe uma data válida.')

/**
 * Mesmas regras, porém aceitando o campo em branco: boa parte da base veio da planilha antiga
 * com apenas nome e carnê, e a Pastoral precisa conseguir completar um dado de cada vez sem que
 * os campos ainda desconhecidos travem a gravação.
 */
const dataNascimentoOpcionalSchema = z
  .string()
  .refine((valor) => !valor.trim() || /^\d{2}\/\d{2}\/\d{4}$/.test(valor), 'Use o formato dd/mm/aaaa.')
  .refine((valor) => !valor.trim() || dataBrEhValida(valor), 'Informe uma data válida.')

const telefoneOpcionalSchema = z
  .string()
  .refine((valor) => !valor.trim() || valor.trim().length >= 14, 'Informe um telefone válido.')

function createSchema(exigirCarne: boolean, camposOpcionais: boolean) {
  return z.object({
    numeroCarne: exigirCarne ? z.string().trim().min(1, 'Informe o número do carnê.') : z.string().optional(),
    sabeNumeroCarne: z.enum(['sim', 'nao', 'novo']),
    nomeCompleto: z.string().min(3, 'Informe o nome completo.'),
    dataNascimento: camposOpcionais ? dataNascimentoOpcionalSchema : dataNascimentoSchema,
    telefone: camposOpcionais ? telefoneOpcionalSchema : z.string().min(14, 'Informe um telefone válido.'),
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
  /**
   * true na edição feita pela Pastoral: nascimento e telefone deixam de ser obrigatórios, para
   * permitir preencher um campo sem ter em mãos os outros. Campos deixados em branco não apagam
   * o que já estava salvo (ver `montarPayload` em services/dizimistaService).
   */
  camposOpcionais?: boolean
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
  camposOpcionais = false,
  limparAposSalvar = false,
  onSalvar,
}: RecadastramentoFormProps) {
  const [erro, setErro] = React.useState<string | null>(null)
  const schema = React.useMemo(
    () => createSchema(exibirCarne, camposOpcionais),
    [exibirCarne, camposOpcionais],
  )

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

  // Só busca no fluxo público de recadastramento: no cadastro pelo admin o carnê ainda não
  // existe (é gerado ao salvar) e na edição os dados já vêm prontos via prop `dizimista`.
  const deveBuscarPorCarne = exibirCarne && !bloquearCarne && sabeNumeroCarne === 'sim'
  const ultimoCarneBuscado = React.useRef<string | null>(null)

  function handleMudarSabeNumero(valor: 'sim' | 'nao' | 'novo') {
    setValue('sabeNumeroCarne', valor)
    ultimoCarneBuscado.current = null
    setStatusCarne(null)
    setErro(null)

    if (valor === 'sim') {
      setValue('numeroCarne', '', { shouldValidate: false })
    }
    if (valor === 'novo') {
      setValue('numeroCarne', '', { shouldValidate: false })
      gerarNovoCarne()
    }
  }

  /** Gera um carnê novo (até 5 dígitos, a partir de 500) ainda livre na base. */
  async function gerarNovoCarne() {
    setErro(null)
    setGerandoCarne(true)
    try {
      const gerado = await gerarNumeroCarneDisponivel()
      setValue('numeroCarne', gerado, { shouldValidate: true })
      setStatusCarne('gerado')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível gerar um número de carnê.')
    } finally {
      setGerandoCarne(false)
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
      // Usa o id real devolvido pela busca (não o que foi digitado): aceita "001" para o carnê
      // "1", mas precisa salvar sob a chave verdadeira, senão viraria um cadastro duplicado.
      reset({
        ...getValues(),
        numeroCarne: encontrado.numeroCarne,
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
      <Label htmlFor="dataNascimento">Data de nascimento{camposOpcionais && ' (opcional)'}</Label>
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
        carneGeradoPeloSite: statusCarne === 'gerado',
      })

      if (limparAposSalvar) {
        reset(valoresDoFormulario())
        ultimoCarneBuscado.current = null
        setStatusCarne(null)
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
            onValueChange={(v) => handleMudarSabeNumero(v as 'sim' | 'nao' | 'novo')}
            className="grid-cols-1 sm:grid-cols-3"
          >
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-input px-3.5 py-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
              <RadioGroupItem value="sim" />
              Já tenho o número do carnê
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-input px-3.5 py-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
              <RadioGroupItem value="nao" />
              Não sei o número do carnê
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-input px-3.5 py-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
              <RadioGroupItem value="novo" />
              Cadastrar dizimista sem carnê (gerar um novo)
            </label>
          </RadioGroup>
        )}

        {exibirCarne && !bloquearCarne && sabeNumeroCarne === 'novo' && gerandoCarne && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Gerando um número de carnê disponível...
          </p>
        )}

        {exibirCarne && !bloquearCarne && sabeNumeroCarne === 'nao' && statusCarne === null && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-4 py-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Não sabe o número do carnê?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Procure a Pastoral do Dízimo da Capela para confirmar seu número — assim evitamos duplicar seu
                  cadastro. Se preferir, você pode continuar agora e gerar um número novo.
                </p>
              </div>

              <Button type="button" className="w-full" onClick={gerarNovoCarne} disabled={gerandoCarne}>
                Gerar um número novo mesmo assim
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
                disabled={bloquearCarne || sabeNumeroCarne === 'nao' || sabeNumeroCarne === 'novo'}
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
              <p className="text-xs text-success">
                Anote este número: ele será usado para acompanhar o dízimo.
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
            <Label htmlFor="telefone">Telefone/WhatsApp{camposOpcionais && ' (opcional)'}</Label>
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
