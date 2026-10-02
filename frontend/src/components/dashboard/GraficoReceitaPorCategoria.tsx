import * as React from 'react'

import { cn } from '@/lib/utils'
import { competenciaCurta, formatCompetencia, formatCurrency } from '@/utils/format'

export interface PontoReceitaCategoria {
  competencia: string
  /** Total de cada categoria nesse mês — chave é o `value` da categoria (ex.: "dizimo"). */
  porCategoria: Record<string, number>
}

interface CategoriaChave {
  value: string
  label: string
}

interface GraficoReceitaPorCategoriaProps {
  /** Um ponto por mês, em ordem cronológica (mais antigo primeiro). */
  dados: PontoReceitaCategoria[]
  /** Ordem fixa das categorias (define também a cor de cada uma — nunca reaproveitada entre categorias). */
  categorias: CategoriaChave[]
}

/**
 * Paleta categórica fixa (ver --chart-1..7 em index.css) — a cor de uma categoria nunca muda,
 * mesmo que outra categoria sem nenhum lançamento no período seja escondida do gráfico.
 *
 * As classes vêm escritas por extenso (nunca `` `bg-${cor}` ``) de propósito: o Tailwind descobre
 * quais classes existem varrendo o código-fonte por strings literais — uma classe só montada em
 * tempo de execução não aparece nesse texto e é removida do CSS final (fica sem cor nenhuma).
 */
const CLASSES_CATEGORIA = [
  { bg: 'bg-chart-1', fill: 'fill-chart-1', stroke: 'stroke-chart-1' },
  { bg: 'bg-chart-2', fill: 'fill-chart-2', stroke: 'stroke-chart-2' },
  { bg: 'bg-chart-3', fill: 'fill-chart-3', stroke: 'stroke-chart-3' },
  { bg: 'bg-chart-4', fill: 'fill-chart-4', stroke: 'stroke-chart-4' },
  { bg: 'bg-chart-5', fill: 'fill-chart-5', stroke: 'stroke-chart-5' },
  { bg: 'bg-chart-6', fill: 'fill-chart-6', stroke: 'stroke-chart-6' },
  { bg: 'bg-chart-7', fill: 'fill-chart-7', stroke: 'stroke-chart-7' },
]

const MARGEM_X = 35
const ESPACAMENTO_X = 70
const MARGEM_SUPERIOR = 10
const ALTURA_DESENHO = 140
const MARGEM_INFERIOR = 24
const ALTURA_TOTAL = MARGEM_SUPERIOR + ALTURA_DESENHO + MARGEM_INFERIOR

/**
 * Evolução mês a mês de cada categoria de receita, uma linha por categoria — categorias sem
 * nenhum valor no período inteiro não aparecem (nem na legenda), mas mantêm sua cor reservada.
 * Toque num mês mostra o detalhamento de cada categoria naquele mês (a cor sozinha não carrega a
 * informação — todo valor também vira texto, ao tocar).
 */
export function GraficoReceitaPorCategoria({ dados, categorias }: GraficoReceitaPorCategoriaProps) {
  const [mesSelecionado, setMesSelecionado] = React.useState<string | null>(null)

  const categoriasComDados = categorias
    .map((cat, indice) => ({ ...cat, cor: CLASSES_CATEGORIA[indice % CLASSES_CATEGORIA.length] }))
    .filter((cat) => dados.some((p) => (p.porCategoria[cat.value] ?? 0) > 0))

  const maximo = Math.max(1, ...dados.flatMap((p) => categoriasComDados.map((cat) => p.porCategoria[cat.value] ?? 0)))

  const x = (indice: number) => MARGEM_X + indice * ESPACAMENTO_X
  const y = (valor: number) => MARGEM_SUPERIOR + ALTURA_DESENHO - (valor / maximo) * ALTURA_DESENHO

  const largura = MARGEM_X * 2 + Math.max(0, dados.length - 1) * ESPACAMENTO_X

  const pontoSelecionado = dados.find((p) => p.competencia === mesSelecionado) ?? null
  const detalheSelecionado = pontoSelecionado
    ? categoriasComDados
        .map((cat) => ({ label: cat.label, valor: pontoSelecionado.porCategoria[cat.value] ?? 0 }))
        .filter((c) => c.valor > 0)
    : []

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {categoriasComDados.map((cat) => (
          <span key={cat.value} className="flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-sm', cat.cor.bg)} />
            {cat.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto pb-1">
        <svg width={largura} height={ALTURA_TOTAL} className="block">
          {categoriasComDados.map((cat) => {
            const linha = dados.map((p, i) => `${x(i)},${y(p.porCategoria[cat.value] ?? 0)}`).join(' ')
            return (
              <g key={cat.value}>
                <polyline
                  points={linha}
                  fill="none"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className={cat.cor.stroke}
                />
                {dados.map((p, i) => (
                  <circle
                    key={p.competencia}
                    cx={x(i)}
                    cy={y(p.porCategoria[cat.value] ?? 0)}
                    r={4}
                    strokeWidth={2}
                    className={cn(cat.cor.fill, 'stroke-card')}
                  />
                ))}
              </g>
            )
          })}

          {dados.map((p, i) => (
            <g key={p.competencia}>
              {/* Coluna inteira clicável — mais fácil de tocar num celular do que um ponto de 4px. */}
              <rect
                x={x(i) - ESPACAMENTO_X / 2}
                y={0}
                width={ESPACAMENTO_X}
                height={ALTURA_TOTAL}
                fill="transparent"
                className={cn('cursor-pointer', mesSelecionado === p.competencia && 'fill-accent/40')}
                onClick={() => setMesSelecionado(p.competencia)}
              />
              <text
                x={x(i)}
                y={MARGEM_SUPERIOR + ALTURA_DESENHO + 16}
                textAnchor="middle"
                className="pointer-events-none fill-muted-foreground text-[10px]"
              >
                {competenciaCurta(p.competencia)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-2 text-center text-xs text-muted-foreground">
        {pontoSelecionado ? (
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span className="font-medium text-foreground">{formatCompetencia(pontoSelecionado.competencia)}:</span>
            {detalheSelecionado.length === 0 ? (
              <span>Nenhuma receita lançada.</span>
            ) : (
              detalheSelecionado.map((c) => (
                <span key={c.label}>
                  {c.label}: {formatCurrency(c.valor)}
                </span>
              ))
            )}
          </p>
        ) : (
          <p>Toque num mês para ver o detalhamento por categoria.</p>
        )}
      </div>
    </div>
  )
}
