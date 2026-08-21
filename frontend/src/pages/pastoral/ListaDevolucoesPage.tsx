import * as React from 'react'
import { ArrowLeftRight, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { FiltroBar } from '@/components/pastoral/FiltroBar'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { DevolucaoForm } from '@/components/forms/DevolucaoForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

import { buscarDizimistaPorCarne, listarDizimistas } from '@/services/dizimistaService'
import {
  atualizarDevolucao,
  excluirDevolucao,
  lancarDevolucao,
  listarTodasDevolucoesPorCarne,
  type DadosDevolucao,
} from '@/services/devolucaoService'
import type { Devolucao } from '@/types'
import { CARNE_AVULSO, formaPagamentoLabel } from '@/constants/devolucao'
import { competenciaAtual, formatarNumeroCarne, formatCompetencia, formatCurrency, formatDate, subtrairMeses } from '@/utils/format'

interface DevolucaoComCarne extends Devolucao {
  numeroCarne: string
}

export function ListaDevolucoesPage() {
  const [competencia, setCompetencia] = React.useState(competenciaAtual())
  const [carregando, setCarregando] = React.useState(true)
  const [todasDevolucoes, setTodasDevolucoes] = React.useState<DevolucaoComCarne[]>([])
  const [nomesPorCarne, setNomesPorCarne] = React.useState<Map<string, string>>(new Map())
  const [devolucaoEmEdicao, setDevolucaoEmEdicao] = React.useState<DevolucaoComCarne | null>(null)
  const [devolucaoParaExcluir, setDevolucaoParaExcluir] = React.useState<DevolucaoComCarne | null>(null)
  const [modalNovaDevolucao, setModalNovaDevolucao] = React.useState(false)
  const [carneNovaDevolucao, setCarneNovaDevolucao] = React.useState('')
  const [buscaCarne, setBuscaCarne] = React.useState('')
  // Muda a cada lançamento com sucesso, forçando o DevolucaoForm a remontar com os campos em
  // branco — assim dá pra lançar várias devoluções seguidas sem fechar o diálogo.
  const [formularioNovaDevolucaoKey, setFormularioNovaDevolucaoKey] = React.useState(0)

  // Busca só a competência selecionada — não tem por que ler o histórico inteiro pra mostrar um
  // mês. Muda de mês, busca de novo (a troca é rápida e fica em cache por 60s, ver cacheLeitura.ts).
  const carregar = React.useCallback(async () => {
    setCarregando(true)
    const [porCarne, dizimistas] = await Promise.all([
      listarTodasDevolucoesPorCarne(competencia, competencia),
      listarDizimistas(),
    ])
    const flat = Object.entries(porCarne).flatMap(([numeroCarne, devs]) => devs.map((d) => ({ ...d, numeroCarne })))
    setTodasDevolucoes(flat)
    setNomesPorCarne(new Map(dizimistas.map((d) => [d.numeroCarne, d.nomeCompleto])))
    setCarregando(false)
  }, [competencia])

  React.useEffect(() => {
    carregar()
  }, [carregar])

  const devolucoesDoMes = React.useMemo(
    () => [...todasDevolucoes].sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1)),
    [todasDevolucoes],
  )

  const devolucoesFiltradas = React.useMemo(() => {
    const termo = buscaCarne.trim().toLowerCase()
    if (!termo) return devolucoesDoMes
    return devolucoesDoMes.filter(
      (d) =>
        d.numeroCarne.toLowerCase().includes(termo) ||
        formatarNumeroCarne(d.numeroCarne).toLowerCase().includes(termo) ||
        (nomesPorCarne.get(d.numeroCarne) ?? '').toLowerCase().includes(termo),
    )
  }, [devolucoesDoMes, buscaCarne, nomesPorCarne])

  const total = devolucoesFiltradas.reduce((soma, d) => soma + d.valor, 0)

  // Os três handlers abaixo atualizam a lista local em vez de chamar `carregar()` de novo — a
  // leitura (agora já filtrada pra só o mês visível) é cara o bastante pra evitar repetir a cada
  // edição, e cada mudança já sabe exatamente o que mudou. Como a lista só tem o mês selecionado,
  // uma devolução que muda pra outra competência (edição retroativa) precisa sair da lista, não
  // só ser atualizada — do contrário ficaria visível num mês que não é mais o dela.

  async function handleAtualizarDevolucao(dados: DadosDevolucao) {
    if (!devolucaoEmEdicao) return
    await atualizarDevolucao(devolucaoEmEdicao.numeroCarne, devolucaoEmEdicao.id, dados)
    setTodasDevolucoes((atual) =>
      dados.competencia === competencia
        ? atual.map((d) => (d.id === devolucaoEmEdicao.id ? { ...d, ...dados } : d))
        : atual.filter((d) => d.id !== devolucaoEmEdicao.id),
    )
    setDevolucaoEmEdicao(null)
    toast.success('Devolução atualizada com sucesso.')
  }

  async function handleExcluirDevolucao() {
    if (!devolucaoParaExcluir) return
    await excluirDevolucao(devolucaoParaExcluir.numeroCarne, devolucaoParaExcluir.id)
    setTodasDevolucoes((atual) => atual.filter((d) => d.id !== devolucaoParaExcluir.id))
    setDevolucaoParaExcluir(null)
    toast.success('Devolução excluída.')
  }

  async function handleLancarNovaDevolucao(dados: DadosDevolucao) {
    const digitado = carneNovaDevolucao.trim()
    if (!digitado) {
      throw new Error('Informe o número do carnê (ou -x- para avulsa).')
    }

    // Aceita o carnê digitado com ou sem zeros à esquerda — usa sempre o id real devolvido pela
    // busca daqui pra frente, senão a devolução ficaria gravada sob uma chave diferente da do
    // dizimista de verdade.
    let numeroCarne = digitado
    if (digitado !== CARNE_AVULSO) {
      const dizimista = await buscarDizimistaPorCarne(digitado)
      if (!dizimista) {
        throw new Error('Carnê não encontrado.')
      }
      numeroCarne = dizimista.numeroCarne
    }

    const nova = await lancarDevolucao(numeroCarne, dados)
    // Só entra na lista visível se for do mês selecionado — lançamentos retroativos pra outro
    // mês continuam invisíveis aqui, do jeito que já era esperado antes dessa mudança.
    if (dados.competencia === competencia) {
      setTodasDevolucoes((atual) => [...atual, { ...nova, numeroCarne }])
    }
    toast.success('Devolução lançada com sucesso.')
    // Mantém o diálogo aberto pra lançar outra em seguida — limpa o carnê e reseta o formulário.
    setCarneNovaDevolucao('')
    setFormularioNovaDevolucaoKey((k) => k + 1)
  }

  return (
    <div>
      <PageHeader
        title="Lista de devoluções"
        description="Todas as devoluções lançadas no mês, de qualquer dizimista — inclusive avulsas."
        actions={
          <Button
            onClick={() => {
              setCarneNovaDevolucao('')
              setModalNovaDevolucao(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Lançar devolução
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCompetencia((c) => subtrairMeses(c, 1))}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="min-w-[9rem] text-center text-base font-semibold text-foreground sm:text-lg">
          {formatCompetencia(competencia)}
        </p>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCompetencia((c) => subtrairMeses(c, -1))}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {competencia !== competenciaAtual() && (
          <Button variant="ghost" size="sm" onClick={() => setCompetencia(competenciaAtual())}>
            Ir para mês atual
          </Button>
        )}
      </div>

      <FiltroBar busca={buscaCarne} onBuscaChange={setBuscaCarne} placeholder="Buscar por nº do carnê ou nome..." />

      {carregando ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : devolucoesFiltradas.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={
            devolucoesDoMes.length === 0
              ? 'Nenhuma devolução lançada neste mês'
              : 'Nenhuma devolução encontrada para essa busca'
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {devolucoesFiltradas.length} devolução(ões) · Total {formatCurrency(total)}
          </p>
          <div className="space-y-3">
            {devolucoesFiltradas.map((d) => {
              const avulso = d.numeroCarne === CARNE_AVULSO
              const nome = avulso ? 'Avulso' : (nomesPorCarne.get(d.numeroCarne) ?? '—')
              return (
                <Card key={`${d.numeroCarne}-${d.id}`}>
                  <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{nome}</p>
                        {avulso ? (
                          <StatusBadge label="Avulso" variant="outline" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Carnê nº {formatarNumeroCarne(d.numeroCarne)}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Lançado em {formatDate(d.criadoEm.slice(0, 10))}
                        {d.lancadoPor ? ` por ${d.lancadoPor}` : ''}
                      </p>
                      {d.observacao && <p className="mt-0.5 text-xs text-muted-foreground">{d.observacao}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge label={formaPagamentoLabel(d.formaPagamento)} variant="outline" />
                        <p className="font-medium text-foreground">{formatCurrency(d.valor)}</p>
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDevolucaoEmEdicao(d)}
                          aria-label="Editar devolução"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDevolucaoParaExcluir(d)}
                          aria-label="Excluir devolução"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Dialog open={!!devolucaoEmEdicao} onOpenChange={(open) => !open && setDevolucaoEmEdicao(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar devolução</DialogTitle>
          </DialogHeader>
          {devolucaoEmEdicao && (
            <DevolucaoForm
              key={devolucaoEmEdicao.id}
              devolucao={devolucaoEmEdicao}
              onSalvar={handleAtualizarDevolucao}
              onCancelar={() => setDevolucaoEmEdicao(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={modalNovaDevolucao} onOpenChange={setModalNovaDevolucao}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançar devolução</DialogTitle>
          </DialogHeader>
          {modalNovaDevolucao && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="numeroCarneNovo">Nº do carnê</Label>
                <Input
                  id="numeroCarneNovo"
                  inputMode="numeric"
                  placeholder="Número do carnê"
                  value={carneNovaDevolucao}
                  onChange={(e) => setCarneNovaDevolucao(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use <span className="font-mono font-medium text-foreground">{CARNE_AVULSO}</span> pra lançar uma
                  devolução avulsa (sem dizimista cadastrado).
                </p>
              </div>
              <DevolucaoForm
                key={formularioNovaDevolucaoKey}
                competenciaPadrao={competencia}
                onSalvar={handleLancarNovaDevolucao}
                onCancelar={() => setModalNovaDevolucao(false)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!devolucaoParaExcluir}
        onOpenChange={(open) => !open && setDevolucaoParaExcluir(null)}
        title="Excluir devolução"
        description="Tem certeza que deseja excluir esta devolução? Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleExcluirDevolucao}
      />
    </div>
  )
}
