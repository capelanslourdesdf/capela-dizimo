import * as React from 'react'

import { cn } from '@/lib/utils'
import { competenciaCurta, formatCompetencia, formatCurrency } from '@/utils/format'

export interface SerieGraficoLinha {
  id: string
  label: string
  /** Um valor por competência, na mesma ordem/tamanho de `competencias`. */
  valores: number[]
  /**
   * Classes do Tailwind escritas por extenso (nunca `` `stroke-${cor}` ``) — o Tailwind descobre
   * quais classes existem varrendo o código-fonte por strings literais, então uma classe só
   * montada em tempo de execução não aparece no CSS final (fica sem cor nenhuma).
   */
  classeStroke: string
  classeFill: string
}

interface GraficoLinhaMultiSerieProps {
  /** Uma competência ("aaaa-mm") por ponto, em ordem cronológica (mais antigo primeiro). */
  competencias: string[]
  series: SerieGraficoLinha[]
}

const MARGEM_X = 20
const MARGEM_SUPERIOR = 12
const ALTURA_DESENHO = 140
const MARGEM_INFERIOR = 24
const ALTURA_TOTAL = MARGEM_SUPERIOR + ALTURA_DESENHO + MARGEM_INFERIOR
const LARGURA_MINIMA = 280

function useLarguraContainer() {
  const ref = React.useRef<HTMLDivElement>(null)
  const [largura, setLargura] = React.useState(0)

  React.useEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    const observer = new ResizeObserver((entries) => setLargura(entries[0].contentRect.width))
    observer.observe(elemento)
    return () => observer.disconnect()
  }, [])

  return [ref, largura] as const
}

/**
 * Gráfico de linha com uma ou mais séries, sempre ocupando a largura inteira do contêiner — o
 * espaçamento entre os meses encolhe conforme mais meses entram no gráfico, em vez de crescer e
 * exigir rolagem horizontal. Passar o mouse (ou tocar, no celular) num mês mostra uma legenda
 * flutuante com o valor exato de cada série ali — a cor nunca é a única forma de ler um valor.
 */
export function GraficoLinhaMultiSerie({ competencias, series }: GraficoLinhaMultiSerieProps) {
  const [containerRef, larguraMedida] = useLarguraContainer()
  const [indiceAtivo, setIndiceAtivo] = React.useState<number | null>(null)

  const seriesComDados = series.filter((s) => s.valores.some((v) => v > 0))
  const mostrarLegenda = seriesComDados.length > 1

  const largura = Math.max(LARGURA_MINIMA, larguraMedida)
  const espacamento = competencias.length > 1 ? (largura - MARGEM_X * 2) / (competencias.length - 1) : 0
  const x = (indice: number) => (competencias.length > 1 ? MARGEM_X + indice * espacamento : largura / 2)

  const maximo = Math.max(1, ...seriesComDados.flatMap((s) => s.valores))
  const y = (valor: number) => MARGEM_SUPERIOR + ALTURA_DESENHO - (valor / maximo) * ALTURA_DESENHO

  const competenciaAtiva = indiceAtivo !== null ? competencias[indiceAtivo] : null
  const detalheAtivo =
    indiceAtivo !== null
      ? seriesComDados.map((s) => ({ label: s.label, valor: s.valores[indiceAtivo] ?? 0 })).filter((d) => d.valor > 0)
      : []

  const leftPercent = indiceAtivo !== null ? Math.min(85, Math.max(15, (x(indiceAtivo) / largura) * 100)) : 50

  return (
    <div ref={containerRef}>
      {mostrarLegenda && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {seriesComDados.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-sm', s.classeFill)} />
              {s.label}
            </span>
          ))}
        </div>
      )}

      <div className="relative" onMouseLeave={() => setIndiceAtivo(null)}>
        {indiceAtivo !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-max max-w-[calc(100%-1rem)] -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md"
            style={{ left: `${leftPercent}%` }}
          >
            <p className="mb-1 font-medium text-foreground">{competenciaAtiva && formatCompetencia(competenciaAtiva)}</p>
            {detalheAtivo.length === 0 ? (
              <p className="text-muted-foreground">Nenhum valor neste mês.</p>
            ) : (
              <ul className="space-y-0.5">
                {detalheAtivo.map((d) => (
                  <li key={d.label} className="flex items-center gap-2 text-foreground">
                    <span>{d.label}:</span>
                    <span className="font-medium">{formatCurrency(d.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <svg width={largura} height={ALTURA_TOTAL} className="block w-full">
          {indiceAtivo !== null && (
            <line
              x1={x(indiceAtivo)}
              x2={x(indiceAtivo)}
              y1={MARGEM_SUPERIOR}
              y2={MARGEM_SUPERIOR + ALTURA_DESENHO}
              className="stroke-border"
              strokeWidth={1}
            />
          )}

          {seriesComDados.map((s) => {
            const linha = s.valores.map((v, i) => `${x(i)},${y(v)}`).join(' ')
            return (
              <g key={s.id}>
                <polyline
                  points={linha}
                  fill="none"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className={s.classeStroke}
                />
                {s.valores.map((v, i) => (
                  <circle
                    key={competencias[i]}
                    cx={x(i)}
                    cy={y(v)}
                    r={indiceAtivo === i ? 5 : 4}
                    strokeWidth={2}
                    className={cn(s.classeFill, 'stroke-card transition-all')}
                  />
                ))}
              </g>
            )
          })}

          {competencias.map((competencia, i) => (
            <g key={competencia}>
              {/* Coluna inteira reage ao mouse/toque — mais fácil de acertar do que um ponto de 4px. */}
              <rect
                x={x(i) - (espacamento || largura) / 2}
                y={0}
                width={espacamento || largura}
                height={ALTURA_TOTAL}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setIndiceAtivo(i)}
                onClick={() => setIndiceAtivo(i)}
              />
              <text
                x={x(i)}
                y={MARGEM_SUPERIOR + ALTURA_DESENHO + 16}
                textAnchor="middle"
                className="pointer-events-none fill-muted-foreground text-[10px]"
              >
                {competenciaCurta(competencia)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
