import * as React from 'react'
import { useFieldArray, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Save, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import type { DadosCadastraisDizimista, Dizimista } from '@/types'
import { maskCep, maskTelefone } from '@/utils/format'

const MAX_FILHOS = 4

const familiarSchema = z.object({
  nomeCompleto: z.string().min(3, 'Informe o nome completo.'),
  dataNascimento: z.string().min(1, 'Informe a data de nascimento.'),
})

function createSchema(exigirCarne: boolean) {
  return z
    .object({
      numeroCarne: exigirCarne ? z.string().trim().min(1, 'Informe o número do carnê.') : z.string().optional(),
      nomeCompleto: z.string().min(3, 'Informe o nome completo.'),
      dataNascimento: z.string().min(1, 'Informe a data de nascimento.'),
      cep: z.string().min(8, 'Informe um CEP válido.'),
      logradouro: z.string().min(1, 'Informe o logradouro.'),
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
    .refine((data) => !data.temConjuge || !!data.conjugeDataNascimento, {
      message: 'Informe a data de nascimento do cônjuge.',
      path: ['conjugeDataNascimento'],
    })
}

type FormValues = z.infer<ReturnType<typeof createSchema>>

interface RecadastramentoFormProps {
  dizimista?: Dizimista
  /** false no cadastro feito pelo admin: o nº do carnê é gerado ao salvar, não informado no form. */
  exibirCarne?: boolean
  bloquearCarne?: boolean
  onSalvar: (dados: DadosCadastraisDizimista, numeroCarneInformado: string) => Promise<void>
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
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      numeroCarne: dizimista?.numeroCarne ?? '',
      nomeCompleto: dizimista?.nomeCompleto ?? '',
      dataNascimento: dizimista?.dataNascimento ?? '',
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
      conjugeDataNascimento: dizimista?.conjuge?.dataNascimento ?? '',
      filhos: dizimista?.filhos ?? [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'filhos' })
  const temConjuge = watch('temConjuge')

  async function onSubmit(values: FormValues) {
    setErro(null)
    try {
      const dados: DadosCadastraisDizimista = {
        nomeCompleto: values.nomeCompleto,
        dataNascimento: values.dataNascimento,
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
          ? { nomeCompleto: values.conjugeNome!.trim(), dataNascimento: values.conjugeDataNascimento! }
          : null,
        filhos: values.filhos,
      }

      await onSalvar(dados, (values.numeroCarne ?? '').trim())
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
            <Input
              id="numeroCarne"
              inputMode="numeric"
              placeholder="Ex.: 1234567"
              disabled={bloquearCarne}
              {...register('numeroCarne')}
            />
            {errors.numeroCarne && <p className="text-xs text-destructive">{errors.numeroCarne.message}</p>}
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
            <Input id="dataNascimento" type="date" {...register('dataNascimento')} />
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
            <Label htmlFor="cep">CEP</Label>
            <Controller
              control={control}
              name="cep"
              render={({ field }) => (
                <Input id="cep" inputMode="numeric" value={field.value} onChange={(e) => field.onChange(maskCep(e.target.value))} />
              )}
            />
            {errors.cep && <p className="text-xs text-destructive">{errors.cep.message}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="logradouro">Logradouro</Label>
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
        <div className="flex items-start gap-2.5">
          <Controller
            control={control}
            name="temConjuge"
            render={({ field }) => (
              <Checkbox id="temConjuge" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
            )}
          />
          <Label htmlFor="temConjuge" className="text-sm font-normal leading-snug">
            Possuo cônjuge
          </Label>
        </div>

        {temConjuge && (
          <Card>
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="conjugeNome">Nome completo do cônjuge</Label>
                <Input id="conjugeNome" {...register('conjugeNome')} />
                {errors.conjugeNome && <p className="text-xs text-destructive">{errors.conjugeNome.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conjugeDataNascimento">Data de nascimento</Label>
                <Input id="conjugeDataNascimento" type="date" {...register('conjugeDataNascimento')} />
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
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor={`filhos.${index}.nomeCompleto`}>Nome completo</Label>
                <Input id={`filhos.${index}.nomeCompleto`} {...register(`filhos.${index}.nomeCompleto`)} />
                {errors.filhos?.[index]?.nomeCompleto && (
                  <p className="text-xs text-destructive">{errors.filhos[index]?.nomeCompleto?.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`filhos.${index}.dataNascimento`}>Data de nascimento</Label>
                <Input id={`filhos.${index}.dataNascimento`} type="date" {...register(`filhos.${index}.dataNascimento`)} />
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
