import type { EstoqueItem } from '../types/database'

// '' representa "sem lote específico" — usado quando o item não tem
// rastreabilidade cadastrada, ou tem só um lote (não há o que escolher).
// Só quando sobra mais de um valor aqui é que a contagem precisa perguntar
// qual lote está sendo contado.
export function lotesDoItem(item: EstoqueItem): string[] {
  if (!item.lotes) return ['']
  const partes = item.lotes
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean)
  return partes.length > 0 ? partes : ['']
}

export function itemTemMultiplosLotes(item: EstoqueItem): boolean {
  return lotesDoItem(item).length > 1
}
