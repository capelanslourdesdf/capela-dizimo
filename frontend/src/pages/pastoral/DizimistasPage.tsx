import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IdCard, Phone, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { FiltroBar } from '@/components/pastoral/FiltroBar'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { RecadastramentoForm } from '@/components/forms/RecadastramentoForm'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { useAdminSessao } from '@/hooks/useAdminSessao'
import { criarDizimistaAdmin, listarDizimistas } from '@/services/dizimistaService'
import type { DadosCadastraisDizimista, Dizimista } from '@/types'
import { getIniciais } from '@/utils/format'
import { ROUTES } from '@/constants/routes'

export function DizimistasPage() {
  const { token } = useAdminSessao()
  const navigate = useNavigate()
  const [dizimistas, setDizimistas] = React.useState<Dizimista[]>([])
  const [carregando, setCarregando] = React.useState(true)
  const [busca, setBusca] = React.useState('')
  const [modalAberto, setModalAberto] = React.useState(false)

  React.useEffect(() => {
    setCarregando(true)
    listarDizimistas(busca).then((dados) => {
      setDizimistas(dados)
      setCarregando(false)
    })
  }, [busca])

  async function handleCadastrar(dados: DadosCadastraisDizimista) {
    if (!token) return
    const numeroCarne = await criarDizimistaAdmin(dados, token)
    setModalAberto(false)
    toast.success(`Dizimista cadastrado(a) com o carnê nº ${numeroCarne}.`)
    navigate(ROUTES.pastoral.dizimistaDetalhe(numeroCarne))
  }

  return (
    <div>
      <PageHeader
        title="Dizimistas"
        description={`${dizimistas.length} dizimista(s) encontrado(s)`}
        actions={
          <Button onClick={() => setModalAberto(true)}>
            <UserPlus className="h-4 w-4" />
            Novo dizimista
          </Button>
        }
      />

      <FiltroBar busca={busca} onBuscaChange={setBusca} placeholder="Buscar por nome ou nº do carnê..." />

      {carregando ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : dizimistas.length === 0 ? (
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
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dizimistas.map((d) => (
                  <TableRow key={d.numeroCarne}>
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
            {dizimistas.map((d) => (
              <Link key={d.numeroCarne} to={ROUTES.pastoral.dizimistaDetalhe(d.numeroCarne)}>
                <Card>
                  <CardContent className="flex items-center gap-3 pt-5">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback>{getIniciais(d.nomeCompleto)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{d.nomeCompleto}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <IdCard className="h-3 w-3" />
                        Carnê nº {d.numeroCarne}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {d.telefone}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
    </div>
  )
}
