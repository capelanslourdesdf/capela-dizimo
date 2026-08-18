import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, IdCard, Phone, Settings, Trash2, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { FiltroBar } from '@/components/pastoral/FiltroBar'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { RecadastramentoForm } from '@/components/forms/RecadastramentoForm'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

import { criarDizimistaAdmin, excluirDizimista, listarDizimistas } from '@/services/dizimistaService'
import { listarTodasDevolucoesPorCarne } from '@/services/devolucaoService'
import { obterMesesParaInativo, salvarMesesParaInativo } from '@/services/configuracaoService'
import type { DadosCadastraisDizimista, Devolucao, Dizimista } from '@/types'
import { getIniciais } from '@/utils/format'
import { baixarArquivoTexto } from '@/utils/download'
import {
  calcularStatusDizimista,
  competenciaDeRegistro,
  competenciasPagasDoDizimista,
  type StatusDizimista,
} from '@/utils/statusDizimista'
import { ROUTES } from '@/constants/routes'

const STATUS_CONFIG: Record<StatusDizimista, { label: string; variant: 'success' | 'muted' }> = {
  ativo: { label: 'Ativo', variant: 'success' },
  inativo: { label: 'Inativo', variant: 'muted' },
}

export function DizimistasPage() {
  const navigate = useNavigate()
  const [dizimistas, setDizimistas] = React.useState<Dizimista[]>([])
  const [devolucoesPorCarne, setDevolucoesPorCarne] = React.useState<Record<string, Devolucao[]>>({})
  const [mesesParaInativo, setMesesParaInativo] = React.useState<number | null>(null)
  const [carregando, setCarregando] = React.useState(true)
  const [busca, setBusca] = React.useState('')
  const [filtroStatus, setFiltroStatus] = React.useState<StatusDizimista | 'todos'>('todos')
  const [modalAberto, setModalAberto] = React.useState(false)
  const [modalConfig, setModalConfig] = React.useState(false)
  const [mesesInput, setMesesInput] = React.useState('')
  const [salvandoConfig, setSalvandoConfig] = React.useState(false)
  const [dizimistaParaExcluir, setDizimistaParaExcluir] = React.useState<Dizimista | null>(null)

  const carregar = React.useCallback(async () => {
    setCarregando(true)
    const [todos, devolucoes, meses] = await Promise.all([
      listarDizimistas(),
      listarTodasDevolucoesPorCarne(),
      obterMesesParaInativo(),
    ])
    setDizimistas(todos)
    setDevolucoesPorCarne(devolucoes)
    setMesesParaInativo(meses)
    setCarregando(false)
  }, [])

  React.useEffect(() => {
    carregar()
  }, [carregar])

  const statusPorCarne = React.useMemo(() => {
    const mapa = new Map<string, StatusDizimista>()
    if (mesesParaInativo === null) return mapa

    for (const d of dizimistas) {
      const devolucoes = devolucoesPorCarne[d.numeroCarne] ?? []
      const status = calcularStatusDizimista(
        competenciaDeRegistro(d),
        competenciasPagasDoDizimista(devolucoes),
        mesesParaInativo,
      )
      mapa.set(d.numeroCarne, status)
    }
    return mapa
  }, [dizimistas, devolucoesPorCarne, mesesParaInativo])

  const dizimistasFiltrados = React.useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return dizimistas.filter((d) => {
      const combinaBusca =
        !termo || d.nomeCompleto.toLowerCase().includes(termo) || d.numeroCarne.includes(termo)
      const combinaStatus = filtroStatus === 'todos' || statusPorCarne.get(d.numeroCarne) === filtroStatus
      return combinaBusca && combinaStatus
    })
  }, [dizimistas, busca, filtroStatus, statusPorCarne])

  async function handleCadastrar(dados: DadosCadastraisDizimista) {
    const numeroCarne = await criarDizimistaAdmin(dados)
    setModalAberto(false)
    toast.success(`Dizimista cadastrado(a) com o carnê nº ${numeroCarne}.`)
    navigate(ROUTES.pastoral.dizimistaDetalhe(numeroCarne))
  }

  async function handleExcluir() {
    if (!dizimistaParaExcluir) return
    try {
      await excluirDizimista(dizimistaParaExcluir.numeroCarne)
      setDizimistas((atual) => atual.filter((d) => d.numeroCarne !== dizimistaParaExcluir.numeroCarne))
      toast.success(`${dizimistaParaExcluir.nomeCompleto} foi excluído(a).`)
      setDizimistaParaExcluir(null)
    } catch {
      toast.error('Não foi possível excluir o dizimista. Tente novamente.')
    }
  }

  function handleExportarAtivos() {
    const ativos = dizimistas.filter((d) => statusPorCarne.get(d.numeroCarne) === 'ativo')
    if (ativos.length === 0) {
      toast.info('Nenhum dizimista ativo para exportar.')
      return
    }

    const conteudo = ativos.map((d) => d.numeroCarne).join('\n')
    const hoje = new Date().toISOString().slice(0, 10)
    baixarArquivoTexto(`carnes-ativos-${hoje}.txt`, conteudo)
    toast.success(`${ativos.length} carnê(s) exportado(s).`)
  }

  function abrirConfig() {
    setMesesInput(String(mesesParaInativo ?? ''))
    setModalConfig(true)
  }

  async function handleSalvarConfig() {
    const valor = Number(mesesInput)
    if (!Number.isInteger(valor) || valor <= 0) {
      toast.error('Informe um número inteiro maior que zero.')
      return
    }

    setSalvandoConfig(true)
    try {
      await salvarMesesParaInativo(valor)
      setMesesParaInativo(valor)
      setModalConfig(false)
      toast.success('Configuração salva.')
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvandoConfig(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Dizimistas"
        description={`${dizimistasFiltrados.length} dizimista(s) encontrado(s)`}
        actions={
          <>
            <Button variant="outline" size="icon" onClick={abrirConfig} aria-label="Configurações de status">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleExportarAtivos}>
              <Download className="h-4 w-4" />
              Exportar ativos
            </Button>
            <Button onClick={() => setModalAberto(true)}>
              <UserPlus className="h-4 w-4" />
              Novo dizimista
            </Button>
          </>
        }
      />

      <FiltroBar busca={busca} onBuscaChange={setBusca} placeholder="Buscar por nome ou nº do carnê...">
        <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as StatusDizimista | 'todos')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </FiltroBar>

      {carregando ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : dizimistasFiltrados.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum dizimista encontrado" description="Ajuste a busca ou cadastre um novo dizimista." />
      ) : (
        <>
          <Card className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dizimista</TableHead>
                  <TableHead>Nº do carnê</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dizimistasFiltrados.map((d) => {
                  const status = statusPorCarne.get(d.numeroCarne)
                  return (
                    <TableRow
                      key={d.numeroCarne}
                      className="cursor-pointer"
                      onClick={() => navigate(ROUTES.pastoral.dizimistaDetalhe(d.numeroCarne))}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{getIniciais(d.nomeCompleto)}</AvatarFallback>
                          </Avatar>
                          <p className="truncate font-medium text-foreground">{d.nomeCompleto}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.numeroCarne}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.telefone}</TableCell>
                      <TableCell>
                        {status && <StatusBadge label={STATUS_CONFIG[status].label} variant={STATUS_CONFIG[status].variant} />}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDizimistaParaExcluir(d)
                          }}
                          aria-label={`Excluir ${d.nomeCompleto}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-3 lg:hidden">
            {dizimistasFiltrados.map((d) => {
              const status = statusPorCarne.get(d.numeroCarne)
              return (
                <Card
                  key={d.numeroCarne}
                  className="cursor-pointer"
                  onClick={() => navigate(ROUTES.pastoral.dizimistaDetalhe(d.numeroCarne))}
                >
                  <CardContent className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback>{getIniciais(d.nomeCompleto)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 truncate font-medium text-foreground">{d.nomeCompleto}</p>
                        {status && <StatusBadge label={STATUS_CONFIG[status].label} variant={STATUS_CONFIG[status].variant} />}
                      </div>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <IdCard className="h-3 w-3" />
                        Carnê nº {d.numeroCarne}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {d.telefone}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDizimistaParaExcluir(d)
                      }}
                      aria-label={`Excluir ${d.nomeCompleto}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar novo dizimista</DialogTitle>
          </DialogHeader>
          <RecadastramentoForm exibirCarne={false} onSalvar={handleCadastrar} />
        </DialogContent>
      </Dialog>

      <Dialog open={modalConfig} onOpenChange={setModalConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Status ativo/inativo</DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="mesesParaInativo">Meses seguidos sem devolução para considerar inativo</Label>
            <Input
              id="mesesParaInativo"
              type="number"
              min={1}
              inputMode="numeric"
              value={mesesInput}
              onChange={(e) => setMesesInput(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Dizimistas com esse número de meses seguidos sem devolução (contados a partir do recadastramento)
              ficam com status Inativo. Quem devolveu em algum mês mais recente que esse fica Ativo.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalConfig(false)} disabled={salvandoConfig}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarConfig} disabled={salvandoConfig}>
              {salvandoConfig ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!dizimistaParaExcluir}
        onOpenChange={(open) => !open && setDizimistaParaExcluir(null)}
        title="Excluir dizimista"
        description={`Tem certeza que deseja excluir ${dizimistaParaExcluir?.nomeCompleto ?? ''}? O histórico de pagamentos e devoluções também será removido. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={handleExcluir}
      />
    </div>
  )
}
