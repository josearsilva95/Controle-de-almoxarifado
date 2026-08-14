import { useMemo } from 'react'
import { Cartao } from './ui/Cartao'
import type { EquipeEstoque, EstoqueContagem, EstoqueEquipeStatus, EstoqueItem } from '../types/database'

interface InventarioPendenciasProps {
  itens: EstoqueItem[]
  contagens: EstoqueContagem[]
  statusEquipes: EstoqueEquipeStatus[]
}

function ListaPendencia({ titulo, itens }: { titulo: string; itens: EstoqueItem[] }) {
  return (
    <Cartao>
      <h3 className="mb-2 text-sm font-semibold text-card-foreground">
        {titulo} <span className="font-normal text-muted-foreground">({itens.length})</span>
      </h3>
      <ul className="max-h-64 divide-y divide-border overflow-y-auto text-sm">
        {itens.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 py-1.5">
            <span className="font-medium text-card-foreground">{item.codigo}</span>
            <span className="truncate text-muted-foreground">{item.descricao}</span>
          </li>
        ))}
      </ul>
    </Cartao>
  )
}

// Só aparece depois que uma equipe marca a contagem dela como finalizada —
// antes disso, "ainda não contou" é só o processo normal em andamento, não
// uma pendência de verdade. A divergência de valor (quando as duas contam o
// mesmo item diferente) já aparece em tempo real em outro lugar.
export function InventarioPendencias({ itens, contagens, statusEquipes }: InventarioPendenciasProps) {
  const equipe1Finalizada = statusEquipes.some((s) => s.equipe === 'equipe_1' && s.finalizada_em)
  const equipe2Finalizada = statusEquipes.some((s) => s.equipe === 'equipe_2' && s.finalizada_em)

  const { faltandoEquipe1, faltandoEquipe2 } = useMemo(() => {
    const porItem = new Map<string, Partial<Record<EquipeEstoque, number>>>()
    for (const c of contagens) {
      const atual = porItem.get(c.item_id) ?? {}
      atual[c.equipe] = c.quantidade
      porItem.set(c.item_id, atual)
    }
    const faltandoEquipe1: EstoqueItem[] = []
    const faltandoEquipe2: EstoqueItem[] = []
    for (const item of itens) {
      const c = porItem.get(item.id) ?? {}
      if (c.equipe_2 != null && c.equipe_1 == null) faltandoEquipe1.push(item)
      if (c.equipe_1 != null && c.equipe_2 == null) faltandoEquipe2.push(item)
    }
    return { faltandoEquipe1, faltandoEquipe2 }
  }, [itens, contagens])

  if (!equipe1Finalizada && !equipe2Finalizada) return null

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {equipe1Finalizada && (
        <ListaPendencia titulo="Itens que a Equipe 1 não contou" itens={faltandoEquipe1} />
      )}
      {equipe2Finalizada && (
        <ListaPendencia titulo="Itens que a Equipe 2 não contou" itens={faltandoEquipe2} />
      )}
    </div>
  )
}
