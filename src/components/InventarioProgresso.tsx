import { useMemo } from 'react'
import { Cartao } from './ui/Cartao'
import type { EquipeEstoque, EstoqueContagem, EstoqueItem } from '../types/database'

interface InventarioProgressoProps {
  itens: EstoqueItem[]
  contagens: EstoqueContagem[]
}

// O número contado vem sozinho e em destaque — o total fica pequeno embaixo,
// separado, pra não dar a impressão de que a equipe já contou tudo.
function Estatistica({ label, valor, deTotal }: { label: string; valor: number; deTotal?: number }) {
  return (
    <Cartao className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-card-foreground">{valor}</p>
      {deTotal != null && <p className="text-xs text-muted-foreground">de {deTotal} itens</p>}
    </Cartao>
  )
}

export function InventarioProgresso({ itens, contagens }: InventarioProgressoProps) {
  const stats = useMemo(() => {
    const porItem = new Map<string, Partial<Record<EquipeEstoque, number>>>()
    for (const c of contagens) {
      const atual = porItem.get(c.item_id) ?? {}
      atual[c.equipe] = c.quantidade
      porItem.set(c.item_id, atual)
    }
    let equipe1 = 0
    let equipe2 = 0
    let divergentes = 0
    let resolvidas = 0
    for (const item of itens) {
      const c = porItem.get(item.id) ?? {}
      if (c.equipe_1 != null) equipe1++
      if (c.equipe_2 != null) equipe2++
      if (c.equipe_1 != null && c.equipe_2 != null && c.equipe_1 !== c.equipe_2) {
        divergentes++
        if (c.equipe_3 != null) resolvidas++
      }
    }
    return { total: itens.length, equipe1, equipe2, divergentes, resolvidas }
  }, [itens, contagens])

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Estatistica label="Total de itens" valor={stats.total} />
      <Estatistica label="Equipe 1 contou" valor={stats.equipe1} deTotal={stats.total} />
      <Estatistica label="Equipe 2 contou" valor={stats.equipe2} deTotal={stats.total} />
      <Estatistica label="Divergências" valor={stats.divergentes} />
      <Estatistica label="Resolvidas pela equipe 3" valor={stats.resolvidas} deTotal={stats.divergentes} />
    </div>
  )
}
