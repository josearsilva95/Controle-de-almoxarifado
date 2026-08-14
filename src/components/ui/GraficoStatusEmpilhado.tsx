export interface ItemStatusEmpilhado {
  rotulo: string
  valor: number
  cor: string
}

/**
 * Parte-todo (distribuição por status) como uma única barra empilhada
 * horizontal, não um donut — mais fácil de comparar fatias e de rotular
 * diretamente. Ponta arredondada só nas duas extremidades da barra inteira;
 * junções internas ficam retas, separadas por um respiro de 2px na cor do
 * fundo (nunca um contorno). Legenda com rótulo + valor sempre visível
 * embaixo, então a cor nunca é a única forma de identificar uma fatia.
 */
export function GraficoStatusEmpilhado({ itens }: { itens: ItemStatusEmpilhado[] }) {
  const total = itens.reduce((soma, item) => soma + item.valor, 0)
  const visiveis = itens.filter((item) => item.valor > 0)

  if (total === 0) {
    return <p className="py-4 text-sm text-muted-foreground">Sem dados ainda.</p>
  }

  return (
    <div>
      <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        {visiveis.map((item) => (
          <div
            key={item.rotulo}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(item.valor / total) * 100}%`, backgroundColor: item.cor }}
            title={`${item.rotulo}: ${item.valor}`}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {itens.map((item) => (
          <div key={item.rotulo} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.cor }} />
            <span className="text-muted-foreground">{item.rotulo}</span>
            <span className="font-semibold text-card-foreground">{item.valor}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
