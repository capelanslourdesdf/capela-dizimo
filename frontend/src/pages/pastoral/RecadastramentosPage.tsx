import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClipboardList, IdCard, Percent, Phone, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { FiltroBar } from '@/components/pastoral/FiltroBar'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatCard } from '@/components/dashboard/StatCard'
import { RecadastramentoForm } from '@/components/forms/RecadastramentoForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { listarDizimistas, salvarRecadastramento } from '@/services/dizimistaService'
import type { DadosCadastraisDizimista, Dizimista } from '@/types'
import { formatarNumeroCarne, formatDate, normalizarNumeroCarne } from '@/utils/format'
import { ROUTES } from '@/constants/routes'

type FiltroRecadastro = 'recadastrados' | 'nao_recadastrados' | 'todos'

/** Só quem passou pelo formulário de recadastramento — importados da planilha ficam de fora até se recadastrarem. `origem` cobre os recadastramentos feitos antes de `recadastradoEm` passar a ser gravado. */
function foiRecadastrado(d: Dizimista): boolean {
  return !!d.recadastradoEm || d.origem === 'recadastramento'
}

/** Data usada para ordenar/exibir: quando o recadastramento foi feito. */
function dataRecadastro(d: Dizimista): string {
  return d.recadastradoEm || d.atualizadoEm || d.criadoEm
}

export function RecadastramentosPage() {
  const navigate = useNavigate()
  const [todosDizimistas, setTodosDizimistas] = React.useState<Dizimista[]>([])
  const [carregando, setCarregando] = React.useState(true)
  const [busca, setBusca] = React.useState('')
  const [filtroStatus, setFiltroStatus] = React.useState<FiltroRecadastro>('recadastrados')
  const [modalRecadastramento, setModalRecadastramento] = React.useState(false)

  const carregar = React.useCallback(() => {
    setCarregando(true)
    listarDizimistas().then((dados) => {
      setTodosDizimistas(dados)
      setCarregando(false)
    })
  }, [])

  // A filtragem da busca é local, então digitar não relê a coleção — só `carregar()` faz isso.
  React.useEffect(() => {
    carregar()
  }, [carregar])

  async function handleSalvarRecadastramento(
    dados: DadosCadastraisDizimista,
    numeroCarneInformado: string,
    opcoes?: { carneGeradoPeloSite?: boolean },
  ) {
    await salvarRecadastramento(numeroCarneInformado, dados, { exigirNovo: opcoes?.carneGeradoPeloSite })
    toast.success(
      `Recadastramento concluído! Carnê nº ${formatarNumeroCarne(normalizarNumeroCarne(numeroCarneInformado))}.`,
      { duration: 8000 },
    )
    carregar()
  }

  const recadastrados = React.useMemo(
    () => todosDizimistas.filter(foiRecadastrado).sort((a, b) => (dataRecadastro(a) < dataRecadastro(b) ? 1 : -1)),
    [todosDizimistas],
  )

  const naoRecadastrados = React.useMemo(
    () =>
      todosDizimistas
        .filter((d) => !foiRecadastrado(d))
        .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR')),
    [todosDizimistas],
  )

  const percentualRecadastrados =
    todosDizimistas.length > 0 ? Math.round((recadastrados.length / todosDizimistas.length) * 100) : 0

  const listaPorFiltro =
    filtroStatus === 'recadastrados' ? recadastrados : filtroStatus === 'nao_recadastrados' ? naoRecadastrados : todosDizimistas

  const listaFiltrada = React.useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return listaPorFiltro

    return listaPorFiltro.filter(
      (d) =>
        [d.nomeCompleto, d.numeroCarne].some((campo) => (campo ?? '').toLowerCase().includes(termo)) ||
        formatarNumeroCarne(d.numeroCarne).includes(termo),
    )
  }, [listaPorFiltro, busca])

  const descricaoContagem =
    filtroStatus === 'nao_recadastrados'
      ? `${listaFiltrada.length} dizimista(s) ainda não recadastrado(s)`
      : filtroStatus === 'todos'
        ? `${listaFiltrada.length} dizimista(s) no total`
        : `${listaFiltrada.length} recadastramento(s) realizado(s)`

  return (
    <div>
      <PageHeader
        title="Recadastramentos"
        description={descricaoContagem}
        actions={
          <Button onClick={() => setModalRecadastramento(true)}>
            <UserPlus className="h-4 w-4" />
            Fazer recadastramento
          </Button>
        }
      />

      {carregando ? (
        <div className="mb-6 grid grid-cols-3 gap-3 lg:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl sm:h-24" />
          ))}
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-3 gap-3 lg:gap-4">
          <StatCard compact label="Recadastrados" value={String(recadastrados.length)} icon={ClipboardList} />
          <StatCard compact label="Não recadastrados" value={String(naoRecadastrados.length)} icon={Users} />
          <StatCard compact label="% recadastrados" value={`${percentualRecadastrados}%`} icon={Percent} />
        </div>
      )}

      <FiltroBar busca={busca} onBuscaChange={setBusca} placeholder="Buscar por nome ou nº do carnê...">
        <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as FiltroRecadastro)}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recadastrados">Recadastrados</SelectItem>
            <SelectItem value="nao_recadastrados">Não recadastrados ainda</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </FiltroBar>

      {carregando ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : listaFiltrada.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={
            filtroStatus === 'nao_recadastrados' ? 'Todo mundo já se recadastrou!' : 'Nenhum recadastramento ainda'
          }
          description={
            filtroStatus === 'nao_recadastrados'
              ? 'Não há dizimistas pendentes de recadastramento.'
              : 'Os recadastramentos feitos pelo site aparecerão aqui.'
          }
        />
      ) : (
        <>
          <Card className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dizimista</TableHead>
                  <TableHead>Nº do carnê</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Data do recadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listaFiltrada.map((d) => (
                  <TableRow
                    key={d.numeroCarne}
                    className="cursor-pointer"
                    onClick={() => navigate(ROUTES.pastoral.dizimistaDetalhe(d.numeroCarne))}
                  >
                    <TableCell className="font-medium">{d.nomeCompleto}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatarNumeroCarne(d.numeroCarne)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.telefone || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {foiRecadastrado(d) ? formatDate(dataRecadastro(d).slice(0, 10)) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-3 lg:hidden">
            {listaFiltrada.map((d) => (
              <Link key={d.numeroCarne} to={ROUTES.pastoral.dizimistaDetalhe(d.numeroCarne)}>
                <Card>
                  <CardContent className="space-y-1 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate font-medium text-foreground">{d.nomeCompleto}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {foiRecadastrado(d) ? formatDate(dataRecadastro(d).slice(0, 10)) : '—'}
                      </span>
                    </div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <IdCard className="h-3 w-3" />
                      Carnê nº {formatarNumeroCarne(d.numeroCarne)}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {d.telefone || '—'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      <Dialog open={modalRecadastramento} onOpenChange={setModalRecadastramento}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fazer recadastramento</DialogTitle>
          </DialogHeader>
          <RecadastramentoForm onSalvar={handleSalvarRecadastramento} limparAposSalvar />
        </DialogContent>
      </Dialog>
    </div>
  )
}
