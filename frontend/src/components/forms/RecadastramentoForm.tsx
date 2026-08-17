import * as React from 'react'
import { useFieldArray, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import type { DadosCadastraisDizimista, Dizimista } from '@/types'
import { buscarEnderecoPorCep } from '@/services/cepService'
import { buscarDizimistaPorCarne, gerarNumeroCarneDisponivel } from '@/services/dizimistaService'
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
      sabeNumeroCarne: z.enum(['sim', 'nao']),
      nomeCompleto: z.string().min(3, 'Informe o nome completo.'),
      dataNascimento: dataNascimentoSchema,
      cep: z.union([z.string().regex(/^\d{5}-\d{3}$/, 'Informe um CEP válido.'), z.literal('')]),
      logradouro: z.string().min(1, 'Informe o endereço.'),
      numero: z.string().optional(),
      semNumero: z.boolean(),
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
      responsavelRecadastramento: z.string().trim().min(3, 'Informe quem preencheu este recadastramento.'),
    })
    .refine((data) => !data.temConjuge || (data.conjugeNome?.trim().length ?? 0) >= 3, {
      message: 'Informe o nome completo do cônjuge.',
      path: ['conjugeNome'],
    })
    .refine((data) => !data.temConjuge || dataBrEhValida(data.conjugeDataNascimento ?? ''), {
      message: 'Informe a data de nascimento do cônjuge no formato dd/mm/aaaa.',
      path: ['conjugeDataNascimento'],
    })
    .refine((data) => data.semNumero || !!data.numero?.trim(), {
      message: 'Informe o número ou marque "Sem número".',
      path: ['numero'],
    })
}

/** Valor gravado no endereço quando o imóvel não tem número. */
const SEM_NUMERO = 'S/N'

type FormValues = z.infer<ReturnType<typeof createSchema>>

/** Achata o objeto de erros do react-hook-form em caminhos ("filhos.0.nomeCompleto"). */
function caminhosComErro(erros: unknown, prefixo = ''): string[] {
  if (!erros || typeof erros !== 'object') return []
  if ('message' in (erros as Record<string, unknown>) && prefixo) return [prefixo]

  return Object.entries(erros as Record<string, unknown>).flatMap(([chave, valor]) =>
    caminhosComErro(valor, prefixo ? `${prefixo}.${chave}` : chave),
  )
}

/**
 * Leva o usuário até o primeiro campo inválido. Os inputs usam `id` igual ao nome do campo, e a
 * ordem é decidida pela posição real no DOM — assim funciona também para os filhos (array).
 */
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
  onSalvar: (
    dados: DadosCadastraisDizimista,
    numeroCarneInformado: string,
    opcoes?: { carneGeradoPeloSite?: boolean },
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
      sabeNumeroCarne: 'sim',
      nomeCompleto: dizimista?.nomeCompleto ?? '',
      dataNascimento: dizimista?.dataNascimento ? dataIsoParaBr(dizimista.dataNascimento) : '',
      cep: dizimista?.endereco.cep ?? '',
      logradouro: dizimista?.endereco.logradouro ?? '',
      numero: dizimista?.endereco.numero === SEM_NUMERO ? '' : (dizimista?.endereco.numero ?? ''),
      semNumero: dizimista?.endereco.numero === SEM_NUMERO,
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
      responsavelRecadastramento: dizimista?.responsavelRecadastramento ?? '',
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'filhos' })
  const temConjuge = watch('temConjuge')
  const semNumero = watch('semNumero')
  const cep = watch('cep')
  const numeroCarneDigitado = watch('numeroCarne')
  const sabeNumeroCarne = watch('sabeNumeroCarne')
  const [buscandoCep, setBuscandoCep] = React.useState(false)
  const [cepNaoEncontrado, setCepNaoEncontrado] = React.useState(false)
  const [buscandoCarne, setBuscandoCarne] = React.useState(false)
  const [gerandoCarne, setGerandoCarne] = React.useState(false)
  const [statusCarne, setStatusCarne] = React.useState<'encontrado' | 'novo' | 'gerado' | null>(null)

  // Só busca no fluxo público de recadastramento: no cadastro pelo admin o carnê ainda não
  // existe (é gerado ao salvar) e na edição os dados já vêm prontos via prop `dizimista`.
  const deveBuscarPorCarne = exibirCarne && !bloquearCarne && sabeNumeroCarne === 'sim'
  const ultimoCarneBuscado = React.useRef<string | null>(null)

  async function handleMudarSabeNumero(valor: 'sim' | 'nao') {
    setValue('sabeNumeroCarne', valor)
    ultimoCarneBuscado.current = null

    if (valor === 'sim') {
      setValue('numeroCarne', '', { shouldValidate: false })
      setStatusCarne(null)
      return
    }

    // Não sabe o número: gera um carnê novo (4 dígitos, a partir de 1000) ainda livre na base.
    setErro(null)
    setGerandoCarne(true)
    try {
      const gerado = await gerarNumeroCarneDisponivel()
      setValue('numeroCarne', gerado, { shouldValidate: true })
      setStatusCarne('gerado')
    } catch (err) {
      setValue('sabeNumeroCarne', 'sim')
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
          numero: values.semNumero ? SEM_NUMERO : (values.numero ?? '').trim(),
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
        responsavelRecadastramento: values.responsavelRecadastramento.trim(),
      }

      await onSalvar(dados, (values.numeroCarne ?? '').trim(), {
        carneGeradoPeloSite: values.sabeNumeroCarne === 'nao' && statusCarne === 'gerado',
      })
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
        <h2 className="text-sm font-semibold text-foreground">Dados do dizimista</h2>

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

        {exibirCarne && (
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
            {!errors.numeroCarne && !gerandoCarne && statusCarne === 'gerado' && (
              <p className="text-xs text-success">
                Geramos este número para você. Anote-o: é com ele que você vai acessar o site.
              </p>
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
                  placeholder="(61) 99999-9999"
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
          <Input id="email" type="email" autoComplete="email" placeholder="exemplo@gmail.com" {...register('email')} />
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
            <Input
              id="numero"
              inputMode="numeric"
              disabled={semNumero}
              placeholder={semNumero ? SEM_NUMERO : undefined}
              {...register('numero')}
            />
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="semNumero"
                render={({ field }) => (
                  <Checkbox
                    id="semNumero"
                    checked={field.value}
                    onCheckedChange={(v) => {
                      const marcado = v === true
                      field.onChange(marcado)
                      if (marcado) setValue('numero', '', { shouldValidate: true })
                    }}
                  />
                )}
              />
              <Label htmlFor="semNumero" className="text-xs font-normal text-muted-foreground">
                Sem número
              </Label>
            </div>
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

      <div className="space-y-1.5">
        <Label htmlFor="responsavelRecadastramento">Responsável pelo recadastramento</Label>
        <Input
          id="responsavelRecadastramento"
          placeholder="Digite o nome de quem fez o recadastramento"
          {...register('responsavelRecadastramento')}
        />
        {errors.responsavelRecadastramento && (
          <p className="text-xs text-destructive">{errors.responsavelRecadastramento.message}</p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        <Save className="h-4 w-4" />
        {isSubmitting ? 'Salvando...' : 'Salvar dados'}
      </Button>
    </form>
  )
}
