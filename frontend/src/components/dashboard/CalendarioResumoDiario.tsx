import { cn } from '@/lib/utils'

const NOMES_DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export interface ResumoDia {
  total: number
  quantidade: number
}

interface CalendarioResumoDiarioProps {
  /** Competência ("aaaa-mm") do mês a desenhar. */
  competencia: string
  /** Resumo por dia ("aaaa-mm-dd") — dias sem entrada aqui aparecem vazios/apagados no calendário. */
  resumosPorDia: Map<string, ResumoDia>
  diaSelecionado: string | null
  onSelecionarDia: (dia: string) => void
  tom: 'success' | 'destructive'
}

function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate()
}

/** 0 (domingo) a 6 (sábado) — em que dia da semana cai o dia 1 do mês. */
function diaDaSemanaDoPrimeiro(ano: number, mes: number): number {
  return new Date(ano, mes - 1, 1).getDay()
}

/** "R$" grudado no número (sem espaço) e sem centavos quando o valor é redondo — cabe melhor numa célula pequena. */
function valorCompacto(valor: number): string {
  const arredondado = Math.round(valor)
  const numero =
    Math.abs(valor - arredondado) < 0.005
      ? arredondado.toLocaleString('pt-BR')
      : valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `R$${numero}`
}

/**
 * Grade de calendário do mês inteiro — cada dia mostra um resumo (valor total, quantidade de
 * lançamentos). Clicar num dia com lançamento é quem decide o que fazer com a seleção (normalmente,
 * expandir a lista daquele dia logo abaixo). Dias sem nenhum lançamento ficam apagados e não são
 * clicáveis — não há nada pra expandir ali.
 */
export function CalendarioResumoDiario({
  competencia,
  resumosPorDia,
  diaSelecionado,
  onSelecionarDia,
  tom,
}: CalendarioResumoDiarioProps) {
  const [anoStr, mesStr] = competencia.split('-')
  const ano = Number(anoStr)
  const mes = Number(mesStr)
  const totalDias = diasNoMes(ano, mes)
  const espacosVazios = diaDaSemanaDoPrimeiro(ano, mes)

  const celulas: (string | null)[] = [
    ...Array.from({ length: espacosVazios }, () => null),
    ...Array.from({ length: totalDias }, (_, i) => `${competencia}-${String(i + 1).padStart(2, '0')}`),
  ]

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {NOMES_DIAS_SEMANA.map((nome) => (
          <span key={nome}>{nome}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {celulas.map((dia, indice) => {
          if (!dia) return <div key={`vazio-${indice}`} />

          const resumo = resumosPorDia.get(dia)
          const numeroDia = Number(dia.slice(8, 10))
          const selecionado = dia === diaSelecionado

          if (!resumo) {
            return (
              <div
                key={dia}
                className="flex min-h-[3.25rem] flex-col items-center justify-center rounded-lg border border-transparent text-xs text-muted-foreground/40"
              >
                {numeroDia}
              </div>
            )
          }

          return (
            <button
              key={dia}
              type="button"
              onClick={() => onSelecionarDia(dia)}
              className={cn(
                'flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-lg border px-0.5 py-1 font-medium transition-colors',
                selecionado
                  ? tom === 'success'
                    ? 'border-success bg-success text-success-foreground'
                    : 'border-destructive bg-destructive text-destructive-foreground'
                  : tom === 'success'
                    ? 'border-success/30 bg-success/10 text-success hover:border-success'
                    : 'border-destructive/30 bg-destructive/10 text-destructive hover:border-destructive',
              )}
            >
              <span className="text-sm leading-none">{numeroDia}</span>
              <span className="text-[10px] leading-none opacity-90">{valorCompacto(resumo.total)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
