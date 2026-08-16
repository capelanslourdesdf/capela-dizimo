import * as React from 'react'
import { useFieldArray, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import type { DadosCadastraisDizimista, Dizimista } from '@/types'
import { buscarEnderecoPorCep } from '@/services/cepService'
import { buscarDizimistaPorCarne } from '@/services/dizimistaService'
import { dataBrEhValida, dataBrParaIso, dataIsoParaBr, maskCep, maskDataBr, maskTelefone } from '@/utils/format'

const MAX_FILHOS = 4

const dataNascimentoSchema = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use o formato dd/mm/aaaa.')
  .refine((valor) => dataBrEhValida(valor), 'Informe uma data válida.')

const familiarSchema = z.object({
  nomeCompleto: z.string().min(3, 'Informe o nome completo.'),
  dataNascimento: dataNascimentoSchema,
})

function createSchema(exigirCarne: boolean) {
  return z
    .object({
      numeroCarne: exigirCarne ? z.string().trim().min(1, 'Informe o número do carnê.') : z.string().optional(),
      alterarNumeroCarne: z.boolean(),
      novoNumeroCarne: z.string().optional(),
      nomeCompleto: z.string().min(3, 'Informe o nome completo.'),
      dataNascimento: dataNascimentoSchema,
      cep: z.union([z.string().regex(/^\d{5}-\d{3}$/, 'Informe um CEP válido.'), z.literal('')]),
      logradouro: z.string().min(1, 'Informe o endereço.'),
      numero: z.string().min(1, 'Informe o número.'),
      complemento: z.string().optional(),
      bairro: z.string().min(1, 'Informe o bairro.'),
      cidade: z.string().min(1, 'Informe a cidade.'),
      estado: z.string().min(2, 'Informe o estado (UF).').max(2),
      telefone: z.string().min(14, 'Informe um telefone válido.'),
      email: z.union([z.string().email('Informe um e-mail válido.'), z.literal('')]),
      temConjuge: z.boolean(),
      conjugeNome: z.string().optional(),
      conjugeDataNascimento: z.string().optional(),
      filhos: z.array(familiarSchema).max(MAX_FILHOS, `No máximo ${MAX_FILHOS} filhos.`),
    })
    .refine((data) => !data.temConjuge || (data.conjugeNome?.trim().length ?? 0) >= 3, {
      message: 'Informe o nome completo do cônjuge.',
      path: ['conjugeNome'],
    })
    .refine((data) => !data.temConjuge || dataBrEhValida(data.conjugeDataNascimento ?? ''), {
      message: 'Informe a data de nascimento do cônjuge no formato dd/mm/aaaa.',
      path: ['conjugeDataNascimento'],
    })
    .refine((data) => !data.alterarNumeroCarne || !!data.novoNumeroCarne?.trim(), {
      message: 'Informe o novo número do carnê.',
      path: ['novoNumeroCarne'],
    })
    .refine((data) => !data.alterarNumeroCarne || data.novoNumeroCarne?.trim() !== data.numeroCarne?.trim(), {
      message: 'O novo número é igual ao atual.',
      path: ['novoNumeroCarne'],
    })
}

type FormValues = z.infer<ReturnType<typeof createSchema>>

interface RecadastramentoFormProps {
  dizimista?: Dizimista
  /** false no cadastro feito pelo admin: o nº do carnê é gerado ao salvar, não informado no form. */
  exibirCarne?: boolean
  bloquearCarne?: boolean
  onSalvar: (
    dados: DadosCadastraisDizimista,
    numeroCarneInformado: string,
    opcoes?: { numeroCarneAnterior?: string },
  ) => Promise<void>
}

export function RecadastramentoForm({
  dizimista,
  exibirCarne = true,
  bloquearCarne = false,
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
    defaultValues: {
      numeroCarne: dizimista?.numeroCarne ?? '',
      alterarNumeroCarne: false,
      novoNumeroCarne: '',
      nomeCompleto: dizimista?.nomeCompleto ?? '',
      dataNascimento: dizimista?.dataNascimento ? dataIsoParaBr(dizimista.dataNascimento) : '',
      cep: dizimista?.endereco.cep ?? '',
      logradouro: dizimista?.endereco.logradouro ?? '',
      numero: dizimista?.endereco.numero ?? '',
      complemento: dizimista?.endereco.complemento ?? '',
      bairro: dizimista?.endereco.bairro ?? '',
      cidade: dizimista?.endereco.cidade ?? '',
      estado: dizimista?.endereco.estado ?? '',
      telefone: dizimista?.telefone ?? '',
      email: dizimista?.email ?? '',
      temConjuge: !!dizimista?.conjuge,
      conjugeNome: dizimista?.conjuge?.nomeCompleto ?? '',
      conjugeDataNascimento: dizimista?.conjuge?.dataNascimento
        ? dataIsoParaBr(dizimista.conjuge.dataNascimento)
        : '',
      filhos: (dizimista?.filhos ?? []).map((f) => ({ ...f, dataNascimento: dataIsoParaBr(f.dataNascimento) })),
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'filhos' })
  const temConjuge = watch('temConjuge')
  const cep = watch('cep')
  const numeroCarneDigitado = watch('numeroCarne')
  const alterarNumeroCarne = watch('alterarNumeroCarne')
  const [buscandoCep, setBuscandoCep] = React.useState(false)
  const [cepNaoEncontrado, setCepNaoEncontrado] = React.useState(false)
  const [buscandoCarne, setBuscandoCarne] = React.useState(false)
  const [statusCarne, setStatusCarne] = React.useState<'encontrado' | 'novo' | null>(null)

  // Só busca no fluxo público de recadastramento: no cadastro pelo admin o carnê ainda não
  // existe (é gerado ao salvar) e na edição os dados já vêm prontos via prop `dizimista`.
  const deveBuscarPorCarne = exibirCarne && !bloquearCarne
  const ultimoCarneBuscado = React.useRef<string | null>(null)

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
      const encontrado = await buscarDizimistaPorCarne(carne).catch(() => null)
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
        // Nova consulta = novo contexto: não faz sentido manter uma troca digitada antes.
        alterarNumeroCarne: false,
        novoNumeroCarne: '',
        nomeCompleto: encontrado.nomeCompleto,
        dataNascimento: dataIsoParaBr(encontrado.dataNascimento),
        cep: encontrado.endereco.cep ?? '',
        logradouro: encontrado.endereco.logradouro ?? '',
        numero: encontrado.endereco.numero ?? '',
        complemento: encontrado.endereco.complemento ?? '',
        bairro: encontrado.endereco.bairro ?? '',
        cidade: encontrado.endereco.cidade ?? '',
        estado: encontrado.endereco.estado ?? '',
        telefone: encontrado.telefone ?? '',
        email: encontrado.email ?? '',
        temConjuge: !!encontrado.conjuge,
        conjugeNome: encontrado.conjuge?.nomeCompleto ?? '',
        conjugeDataNascimento: encontrado.conjuge?.dataNascimento
          ? dataIsoParaBr(encontrado.conjuge.dataNascimento)
          : '',
        filhos: (encontrado.filhos ?? []).map((f) => ({
          nomeCompleto: f.nomeCompleto,
          dataNascimento: dataIsoParaBr(f.dataNascimento),
        })),
      })
    }, 600)

    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [numeroCarneDigitado, deveBuscarPorCarne, reset, getValues])

  React.useEffect(() => {
    const digitos = cep.replace(/\D/g, '')
    if (digitos.length !== 8) {
      setCepNaoEncontrado(false)
      return
    }

    let cancelado = false
    setBuscandoCep(true)
    setCepNaoEncontrado(false)

    buscarEnderecoPorCep(digitos).then((endereco) => {
      if (cancelado) return
      setBuscandoCep(false)

      if (!endereco) {
        setCepNaoEncontrado(true)
        return
      }

      setValue('logradouro', endereco.logradouro, { shouldValidate: true })
      setValue('bairro', endereco.bairro, { shouldValidate: true })
      setValue('cidade', endereco.cidade, { shouldValidate: true })
      setValue('estado', endereco.estado, { shouldValidate: true })
    })

    return () => {
      cancelado = true
    }
  }, [cep, setValue])

  async function onSubmit(values: FormValues) {
    setErro(null)
    try {
      const dados: DadosCadastraisDizimista = {
        nomeCompleto: values.nomeCompleto,
        dataNascimento: dataBrParaIso(values.dataNascimento),
        endereco: {
          cep: values.cep,
          logradouro: values.logradouro,
          numero: values.numero,
          complemento: values.complemento || undefined,
          bairro: values.bairro,
          cidade: values.cidade,
          estado: values.estado.toUpperCase(),
        },
        telefone: values.telefone,
        email: values.email || undefined,
        conjuge: values.temConjuge
          ? {
              nomeCompleto: values.conjugeNome!.trim(),
              dataNascimento: dataBrParaIso(values.conjugeDataNascimento!),
            }
          : null,
        filhos: values.filhos.map((f) => ({
          nomeCompleto: f.nomeCompleto,
          dataNascimento: dataBrParaIso(f.dataNascimento),
        })),
      }

      const carneAtual = (values.numeroCarne ?? '').trim()
      const carneNovo = (values.novoNumeroCarne ?? '').trim()
      const trocouCarne =
        values.alterarNumeroCarne && !!carneNovo && carneNovo !== carneAtual && statusCarne === 'encontrado'

      await onSalvar(
        dados,
        trocouCarne ? carneNovo : carneAtual,
        trocouCarne ? { numeroCarneAnterior: carneAtual } : undefined,
      )
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Dados do dizimista</h2>

        {exibirCarne && (
          <div className="space-y-1.5">
            <Label htmlFor="numeroCarne">Nº do carnê</Label>
            <div className="relative">
              <Input
                id="numeroCarne"
                inputMode="numeric"
                placeholder="Número impresso no carnê"
                disabled={bloquearCarne}
                className={buscandoCarne ? 'pr-9' : undefined}
                {...register('numeroCarne')}
              />
              {buscandoCarne && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
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
          </div>
        )}

        {exibirCarne && !bloquearCarne && statusCarne === 'encontrado' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="alterarNumeroCarne" className="font-normal">
                Alterar número do carnê
              </Label>
              <Controller
                control={control}
                name="alterarNumeroCarne"
                render={({ field }) => (
                  <Switch id="alterarNumeroCarne" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            {alterarNumeroCarne && (
              <div className="space-y-1.5">
                <Label htmlFor="novoNumeroCarne">Novo nº do carnê</Label>
                <Input
                  id="novoNumeroCarne"
                  inputMode="numeric"
                  placeholder="Número do novo carnê"
                  {...register('novoNumeroCarne')}
                />
                {errors.novoNumeroCarne ? (
                  <p className="text-xs text-destructive">{errors.novoNumeroCarne.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ao salvar, o cadastro passa para este número, levando junto o histórico de
                    pagamentos e devoluções.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="nomeCompleto">Nome completo</Label>
          <Input id="nomeCompleto" autoComplete="name" {...register('nomeCompleto')} />
          {errors.nomeCompleto && <p className="text-xs text-destructive">{errors.nomeCompleto.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="space-y-1.5">
            <Label htmlFor="telefone">Telefone</Label>
            <Controller
              control={control}
              name="telefone"
              render={({ field }) => (
                <Input
                  id="telefone"
                  inputMode="numeric"
                  placeholder="(11) 98765-4321"
                  autoComplete="tel"
                  value={field.value}
                  onChange={(e) => field.onChange(maskTelefone(e.target.value))}
                />
              )}
            />
            {errors.telefone && <p className="text-xs text-destructive">{errors.telefone.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail (opcional)</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="seuemail@exemplo.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Endereço</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="cep">CEP (opcional)</Label>
            <div className="relative">
              <Controller
                control={control}
                name="cep"
                render={({ field }) => (
                  <Input
                    id="cep"
                    inputMode="numeric"
                    className={buscandoCep ? 'pr-9' : undefined}
                    value={field.value}
                    onChange={(e) => field.onChange(maskCep(e.target.value))}
                  />
                )}
              />
              {buscandoCep && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            {errors.cep && <p className="text-xs text-destructive">{errors.cep.message}</p>}
            {!errors.cep && cepNaoEncontrado && (
              <p className="text-xs text-muted-foreground">CEP não encontrado, preencha o endereço manualmente.</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="logradouro">Endereço</Label>
            <Input id="logradouro" {...register('logradouro')} />
            {errors.logradouro && <p className="text-xs text-destructive">{errors.logradouro.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" {...register('numero')} />
            {errors.numero && <p className="text-xs text-destructive">{errors.numero.message}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="complemento">Complemento (opcional)</Label>
            <Input id="complemento" {...register('complemento')} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" {...register('bairro')} />
            {errors.bairro && <p className="text-xs text-destructive">{errors.bairro.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estado">UF</Label>
            <Input id="estado" maxLength={2} className="uppercase" {...register('estado')} />
            {errors.estado && <p className="text-xs text-destructive">{errors.estado.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cidade">Cidade</Label>
          <Input id="cidade" {...register('cidade')} />
          {errors.cidade && <p className="text-xs text-destructive">{errors.cidade.message}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Controller
            control={control}
            name="temConjuge"
            render={({ field }) => (
              <Checkbox id="temConjuge" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
            )}
          />
          <Label htmlFor="temConjuge" className="text-sm font-normal">
            Possuo cônjuge
          </Label>
        </div>

        {temConjuge && (
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="conjugeNome">Nome completo do cônjuge</Label>
                <Input id="conjugeNome" {...register('conjugeNome')} />
                {errors.conjugeNome && <p className="text-xs text-destructive">{errors.conjugeNome.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conjugeDataNascimento">Data de nascimento</Label>
                <Controller
                  control={control}
                  name="conjugeDataNascimento"
                  render={({ field }) => (
                    <Input
                      id="conjugeDataNascimento"
                      inputMode="numeric"
                      placeholder="dd/mm/aaaa"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(maskDataBr(e.target.value))}
                    />
                  )}
                />
                {errors.conjugeDataNascimento && (
                  <p className="text-xs text-destructive">{errors.conjugeDataNascimento.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Filhos (até {MAX_FILHOS})</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= MAX_FILHOS}
            onClick={() => append({ nomeCompleto: '', dataNascimento: '' })}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar filho
          </Button>
        </div>

        {fields.length === 0 && <p className="text-sm text-muted-foreground">Nenhum filho adicionado.</p>}

        {fields.map((field, index) => (
          <Card key={field.id}>
            <CardContent className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor={`filhos.${index}.nomeCompleto`}>Nome completo</Label>
                <Input id={`filhos.${index}.nomeCompleto`} {...register(`filhos.${index}.nomeCompleto`)} />
                {errors.filhos?.[index]?.nomeCompleto && (
                  <p className="text-xs text-destructive">{errors.filhos[index]?.nomeCompleto?.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`filhos.${index}.dataNascimento`}>Data de nascimento</Label>
                <Controller
                  control={control}
                  name={`filhos.${index}.dataNascimento`}
                  render={({ field }) => (
                    <Input
                      id={`filhos.${index}.dataNascimento`}
                      inputMode="numeric"
                      placeholder="dd/mm/aaaa"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(maskDataBr(e.target.value))}
                    />
                  )}
                />
                {errors.filhos?.[index]?.dataNascimento && (
                  <p className="text-xs text-destructive">{errors.filhos[index]?.dataNascimento?.message}</p>
                )}
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Remover filho">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        <Save className="h-4 w-4" />
        {isSubmitting ? 'Salvando...' : 'Salvar dados'}
      </Button>
    </form>
  )
}
