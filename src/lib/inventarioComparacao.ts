import { lotesDoItem } from './lotesItem'
import type { EquipeEstoque, EstoqueContagem, EstoqueItem } from '../types/database'

export interface LinhaLote {
  item: EstoqueItem
  lote: string
  // true quando o item tem 2+ lotes cadastrados — só nesse caso "lote" é
  // um valor real escolhido por quem contou (senão é só o slot único do item).
  temLote: boolean
  equipe1: number | null
  equipe2: number | null
  equipe3: number | null
  divergeEntreEquipes: boolean
}

export interface LinhaItem {
  item: EstoqueItem
  sistema: number | null
  // Soma das contagens da equipe em todos os lotes do item — só definido
  // quando ela já contou TODOS os lotes (soma parcial não diz nada).
  equipe1Total: number | null
  equipe2Total: number | null
  divergeSistemaEquipe1: boolean
  divergeSistemaEquipe2: boolean
}

function chave(itemId: string, equipe: EquipeEstoque, lote: string): string {
  return `${itemId}::${equipe}::${lote}`
}

function indexarContagens(contagens: EstoqueContagem[]): Map<string, number> {
  const mapa = new Map<string, number>()
  for (const c of contagens) mapa.set(chave(c.item_id, c.equipe, c.lote), c.quantidade)
  return mapa
}

// Uma linha por (item, lote) — a granularidade real da contagem. Compara
// equipe 1 x equipe 2 no mesmo lote; a quantidade do sistema não entra
// aqui porque só existe por item (soma de todos os lotes), não por lote.
export function compararContagens(itens: EstoqueItem[], contagens: EstoqueContagem[]): LinhaLote[] {
  const porChave = indexarContagens(contagens)
  const linhas: LinhaLote[] = []

  for (const item of itens) {
    const lotes = lotesDoItem(item)
    const temLote = lotes.length > 1
    for (const lote of lotes) {
      const equipe1 = porChave.get(chave(item.id, 'equipe_1', lote)) ?? null
      const equipe2 = porChave.get(chave(item.id, 'equipe_2', lote)) ?? null
      const equipe3 = porChave.get(chave(item.id, 'equipe_3', lote)) ?? null
      linhas.push({
        item,
        lote,
        temLote,
        equipe1,
        equipe2,
        equipe3,
        divergeEntreEquipes: equipe1 != null && equipe2 != null && equipe1 !== equipe2,
      })
    }
  }
  return linhas
}

// Uma linha por item — soma dos lotes contados por cada equipe, comparada
// com a quantidade oficial do sistema (que é por item, não por lote).
export function compararTotaisPorItem(itens: EstoqueItem[], contagens: EstoqueContagem[]): LinhaItem[] {
  const porChave = indexarContagens(contagens)

  return itens.map((item) => {
    const lotes = lotesDoItem(item)
    const sistema = item.quantidade

    function total(equipe: EquipeEstoque): number | null {
      let soma = 0
      for (const lote of lotes) {
        const valor = porChave.get(chave(item.id, equipe, lote))
        if (valor == null) return null
        soma += valor
      }
      return soma
    }

    const equipe1Total = total('equipe_1')
    const equipe2Total = total('equipe_2')

    return {
      item,
      sistema,
      equipe1Total,
      equipe2Total,
      divergeSistemaEquipe1: sistema != null && equipe1Total != null && sistema !== equipe1Total,
      divergeSistemaEquipe2: sistema != null && equipe2Total != null && sistema !== equipe2Total,
    }
  })
}
