import * as React from 'react'
import { Pencil, Trash2, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import {
  atualizarMembroPastoral,
  criarMembroPastoral,
  excluirMembroPastoral,
  listarMembrosPastoral,
} from '@/services/membroPastoralService'
import type { MembroPastoral } from '@/types'

export function MembrosPastoralPage() {
  const [membros, setMembros] = React.useState<MembroPastoral[]>([])
  const [carregando, setCarregando] = React.useState(true)
  const [modalAberto, setModalAberto] = React.useState(false)
  const [emEdicao, setEmEdicao] = React.useState<MembroPastoral | null>(null)
  const [nome, setNome] = React.useState('')
  const [salvando, setSalvando] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)
  const [paraExcluir, setParaExcluir] = React.useState<MembroPastoral | null>(null)

  const carregar = React.useCallback(async () => {
    setCarregando(true)
    setMembros(await listarMembrosPastoral())
    setCarregando(false)
  }, [])

  React.useEffect(() => {
    carregar()
  }, [carregar])

  function abrirNovo() {
    setEmEdicao(null)
    setNome('')
    setErro(null)
    setModalAberto(true)
  }

  function abrirEdicao(membro: MembroPastoral) {
    setEmEdicao(membro)
    setNome(membro.nome)
    setErro(null)
    setModalAberto(true)
  }

  async function handleSalvar() {
    const valor = nome.trim()
    if (valor.length < 3) {
      setErro('Informe o nome completo do membro.')
      return
    }

    setSalvando(true)
    try {
      if (emEdicao) {
        await atualizarMembroPastoral(emEdicao.id, valor)
        toast.success('Membro atualizado.')
      } else {
        await criarMembroPastoral(valor)
        toast.success('Membro cadastrado.')
      }
      setModalAberto(false)
      await carregar()
    } catch {
      setErro('Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir() {
    if (!paraExcluir) return
    try {
      await excluirMembroPastoral(paraExcluir.id)
      setMembros((atual) => atual.filter((m) => m.id !== paraExcluir.id))
      toast.success(`${paraExcluir.nome} foi removido(a).`)
      setParaExcluir(null)
    } catch {
      toast.error('Não foi possível remover o membro.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Membros da Pastoral"
        description="Quem pode ser indicado como responsável por um lançamento de devolução."
        actions={
          <Button onClick={abrirNovo}>
            <UserPlus className="h-4 w-4" />
            Novo membro
          </Button>
        }
      />

      {carregando ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : membros.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum membro cadastrado"
          description="Cadastre os membros da Pastoral do Dízimo para poder registrar quem lançou cada devolução."
          action={
            <Button onClick={abrirNovo}>
              <UserPlus className="h-4 w-4" />
              Cadastrar membro
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {membros.map((membro) => (
            <Card key={membro.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <p className="min-w-0 truncate font-medium text-foreground">{membro.nome}</p>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => abrirEdicao(membro)} aria-label={`Editar ${membro.nome}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setParaExcluir(membro)}
                    aria-label={`Remover ${membro.nome}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{emEdicao ? 'Editar membro' : 'Novo membro'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="nomeMembro">Nome</Label>
            <Input
              id="nomeMembro"
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              placeholder="Nome do membro da Pastoral"
              autoFocus
            />
            {erro && <p className="text-xs text-destructive">{erro}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!paraExcluir}
        onOpenChange={(open) => !open && setParaExcluir(null)}
        title="Remover membro"
        description={`Deseja remover ${paraExcluir?.nome ?? ''} da lista de membros? Os lançamentos já feitos por esta pessoa continuam registrados.`}
        confirmLabel="Remover"
        destructive
        onConfirm={handleExcluir}
      />
    </div>
  )
}
