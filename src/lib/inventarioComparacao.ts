import type { EquipeEstoque, EstoqueContagem, EstoqueItem } from '../types/database'

export interface LinhaComparacao {
  item: EstoqueItem
  sistema: number | null
  equipe1: number | null
  equipe2: number | null
  equipe3: number | null
  divergeSistemaEquipe1: boolean
  divergeSistemaEquipe2: boolean
  divergeEntreEquipes: boolean
}

// Junta o catálogo com as contagens de cada equipe, item por item, e já
// calcula os três tipos de divergência que interessam pro inventário:
// equipe 1 x sistema, equipe 2 x sistema, e equipe 1 x equipe 2 entre si.
// Usado no Excel, nos alertas de Relatórios e em qualquer outra tela que
// precise da mesma comparação, pra não duplicar essa lógica em cada lugar.
export function compararContagens(itens: EstoqueItem[], contagens: EstoqueContagem[]): LinhaComparacao[] {
  const porItem = new Map<string, Partial<Record<EquipeEstoque, number>>>()
  for (const c of contagens) {
    const atual = porItem.get(c.item_id) ?? {}
    atual[c.equipe] = c.quantidade
    porItem.set(c.item_id, atual)
  }

  return itens.map((item) => {
    const c = porItem.get(item.id) ?? {}
    const sistema = item.quantidade
    const equipe1 = c.equipe_1 ?? null
    const equipe2 = c.equipe_2 ?? null
    const equipe3 = c.equipe_3 ?? null
    return {
      item,
      sistema,
      equipe1,
      equipe2,
      equipe3,
      divergeSistemaEquipe1: sistema != null && equipe1 != null && sistema !== equipe1,
      divergeSistemaEquipe2: sistema != null && equipe2 != null && sistema !== equipe2,
      divergeEntreEquipes: equipe1 != null && equipe2 != null && equipe1 !== equipe2,
    }
  })
}
