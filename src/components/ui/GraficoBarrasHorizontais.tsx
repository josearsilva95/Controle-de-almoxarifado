export interface ItemGraficoBarras {
  rotulo: string
  valor: number
  cor: string
}

interface GraficoBarrasHorizontaisProps {
  itens: ItemGraficoBarras[]
  vazio?: string
}

/**
 * Gráfico de barras horizontais desenhado à mão (sem lib de charts): barra com
 * ~20px de espessura, ponta arredondada só no lado do dado (base reta), rótulo
 * de valor sempre visível ao lado (nunca só em hover) e um título nativo para
 * leitura assistiva/tooltip. Cores vêm de fora — cada categoria usa a cor
 * semântica já usada em badges no resto do app, para consistência visual.
 */
export function GraficoBarrasHorizontais({ itens, vazio }: GraficoBarrasHorizontaisProps) {
  if (itens.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">{vazio ?? 'Sem dados ainda.'}</p>
  }

  const maiorValor = Math.max(1, ...itens.map((i) => i.valor))

  return (
    <div className="space-y-3.5">
      {itens.map((item) => {
        const percent = (item.valor / maiorValor) * 100
        return (
          <div
            key={item.rotulo}
            className="group flex items-center gap-3"
            title={`${item.rotulo}: ${item.valor}`}
          >
            <span className="w-28 shrink-0 truncate text-sm text-card-foreground">{item.rotulo}</span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
              <div
                className="h-5 rounded-r transition-[width] duration-300 group-hover:brightness-110"
                style={{ width: `${percent}%`, backgroundColor: item.cor }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums text-muted-foreground">
              {item.valor}
            </span>
          </div>
        )
      })}
    </div>
  )
}
