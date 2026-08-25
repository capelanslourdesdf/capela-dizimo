import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CampoNumeroCarneDevolucaoProps {
  numeroCarne: string
  onNumeroCarneChange: (valor: string) => void
  avulsa: boolean
  onAvulsaChange: (valor: boolean) => void
}

/**
 * Campo de nº do carnê usado ao lançar uma devolução, com a opção de marcar como avulsa (sem
 * dizimista cadastrado) — nesse caso o campo de carnê some, e quem lança nunca precisa saber nem
 * digitar o carnê reservado (`CARNE_AVULSO`, em constants/devolucao.ts).
 */
export function CampoNumeroCarneDevolucao({
  numeroCarne,
  onNumeroCarneChange,
  avulsa,
  onAvulsaChange,
}: CampoNumeroCarneDevolucaoProps) {
  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-input px-3.5 py-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
        <Checkbox checked={avulsa} onCheckedChange={(v) => onAvulsaChange(v === true)} className="mt-0.5" />
        <span>
          <span className="block text-sm font-medium text-foreground">Devolução avulsa</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Sem dizimista cadastrado — não precisa informar o nº do carnê.
          </span>
        </span>
      </label>

      {!avulsa && (
        <div className="space-y-1.5">
          <Label htmlFor="numeroCarneDevolucao">Nº do carnê</Label>
          <Input
            id="numeroCarneDevolucao"
            inputMode="numeric"
            placeholder="Número do carnê"
            value={numeroCarne}
            onChange={(e) => onNumeroCarneChange(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
