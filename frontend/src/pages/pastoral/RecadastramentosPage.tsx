import * as React from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, IdCard, Phone, User } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { FiltroBar } from '@/components/pastoral/FiltroBar'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

import { listarDizimistas } from '@/services/dizimistaService'
import type { Dizimista } from '@/types'
import { formatDate } from '@/utils/format'
import { ROUTES } from '@/constants/routes'

/** Data usada para ordenar/exibir: quando o recadastramento foi feito. */
function dataRecadastro(d: Dizimista): string {
  return d.recadastradoEm || d.atualizadoEm || d.criadoEm
}

export function RecadastramentosPage() {
  const [todos, setTodos] = React.useState<Dizimista[]>([])
  const [carregando, setCarregando] = React.useState(true)
  const [busca, setBusca] = React.useState('')

  React.useEffect(() => {
    // Carrega uma única vez: a filtragem é local, então digitar na busca não relê a coleção.
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

  const recadastrados = React.useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return todos

    return todos.filter((d) =>
      [d.nomeCompleto, d.numeroCarne, d.responsavelRecadastramento].some((campo) =>
        (campo ?? '').toLowerCase().includes(termo),
      ),
    )
  }, [todos, busca])

  return (
    <div>
      <PageHeader
        title="Recadastramentos"
        description={`${recadastrados.length} recadastramento(s) realizado(s)`}
      />

      <FiltroBar
        busca={busca}
        onBuscaChange={setBusca}
        placeholder="Buscar por nome, nº do carnê ou responsável..."
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
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recadastrados.map((d) => (
                  <TableRow key={d.numeroCarne}>
                    <TableCell className="font-medium">{d.nomeCompleto}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.numeroCarne}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.telefone || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.responsavelRecadastramento || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(dataRecadastro(d).slice(0, 10))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={ROUTES.pastoral.dizimistaDetalhe(d.numeroCarne)}>Ver perfil</Link>
                      </Button>
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
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      Responsável: {d.responsavelRecadastramento || '—'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
