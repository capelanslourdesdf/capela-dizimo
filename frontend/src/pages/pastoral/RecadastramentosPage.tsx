import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClipboardList, IdCard, Phone, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { FiltroBar } from '@/components/pastoral/FiltroBar'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { RecadastramentoForm } from '@/components/forms/RecadastramentoForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { listarDizimistas, salvarRecadastramento } from '@/services/dizimistaService'
import type { DadosCadastraisDizimista, Dizimista } from '@/types'
import { formatDate } from '@/utils/format'
import { ROUTES } from '@/constants/routes'

/** Data usada para ordenar/exibir: quando o recadastramento foi feito. */
function dataRecadastro(d: Dizimista): string {
  return d.recadastradoEm || d.atualizadoEm || d.criadoEm
}

export function RecadastramentosPage() {
  const navigate = useNavigate()
  const [todos, setTodos] = React.useState<Dizimista[]>([])
  const [carregando, setCarregando] = React.useState(true)
  const [busca, setBusca] = React.useState('')
  const [modalRecadastramento, setModalRecadastramento] = React.useState(false)

  const carregar = React.useCallback(() => {
    setCarregando(true)
    listarDizimistas().then((dados) => {
      // Só quem passou pelo formulário de recadastramento (importados da planilha ficam de fora
      // até se recadastrarem). `origem` cobre os recadastramentos feitos antes de `recadastradoEm`
      // passar a ser gravado.
      setTodos(
        dados
          .filter((d) => !!d.recadastradoEm || d.origem === 'recadastramento')
          .sort((a, b) => (dataRecadastro(a) < dataRecadastro(b) ? 1 : -1)),
      )
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
    toast.success(`Recadastramento concluído! Carnê nº ${numeroCarneInformado}.`, { duration: 8000 })
    carregar()
  }

  const recadastrados = React.useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return todos

    return todos.filter((d) =>
      [d.nomeCompleto, d.numeroCarne].some((campo) => (campo ?? '').toLowerCase().includes(termo)),
    )
  }, [todos, busca])

  return (
    <div>
      <PageHeader
        title="Recadastramentos"
        description={`${recadastrados.length} recadastramento(s) realizado(s)`}
        actions={
          <Button onClick={() => setModalRecadastramento(true)}>
            <UserPlus className="h-4 w-4" />
            Fazer recadastramento
          </Button>
        }
      />

      <FiltroBar
        busca={busca}
        onBuscaChange={setBusca}
        placeholder="Buscar por nome ou nº do carnê..."
      />

      {carregando ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : recadastrados.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum recadastramento ainda"
          description="Os recadastramentos feitos pelo site aparecerão aqui."
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
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recadastrados.map((d) => (
                  <TableRow
                    key={d.numeroCarne}
                    className="cursor-pointer"
                    onClick={() => navigate(ROUTES.pastoral.dizimistaDetalhe(d.numeroCarne))}
                  >
                    <TableCell className="font-medium">{d.nomeCompleto}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.numeroCarne}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.telefone || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(dataRecadastro(d).slice(0, 10))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-3 lg:hidden">
            {recadastrados.map((d) => (
              <Link key={d.numeroCarne} to={ROUTES.pastoral.dizimistaDetalhe(d.numeroCarne)}>
                <Card>
                  <CardContent className="space-y-1 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate font-medium text-foreground">{d.nomeCompleto}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(dataRecadastro(d).slice(0, 10))}
                      </span>
                    </div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <IdCard className="h-3 w-3" />
                      Carnê nº {d.numeroCarne}
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
