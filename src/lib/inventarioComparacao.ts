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
  // Local (código de estoque_locais) que cada equipe bipou ao contar esse
  // lote — pode diferir entre equipe 1 e 2 (item remanejado sem avisar).
  localEquipe1: string | null
  localEquipe2: string | null
  localEquipe3: string | null
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

interface EntradaContagem {
  quantidade: number
  local: string | null
}

function chave(itemId: string, equipe: EquipeEstoque, lote: string): string {
  return `${itemId}::${equipe}::${lote}`
}

function indexarContagens(contagens: EstoqueContagem[]): Map<string, EntradaContagem> {
  const mapa = new Map<string, EntradaContagem>()
  for (const c of contagens) mapa.set(chave(c.item_id, c.equipe, c.lote), { quantidade: c.quantidade, local: c.local })
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
      const e1 = porChave.get(chave(item.id, 'equipe_1', lote))
      const e2 = porChave.get(chave(item.id, 'equipe_2', lote))
      const e3 = porChave.get(chave(item.id, 'equipe_3', lote))
      const equipe1 = e1?.quantidade ?? null
      const equipe2 = e2?.quantidade ?? null
      linhas.push({
        item,
        lote,
        temLote,
        equipe1,
        equipe2,
        equipe3: e3?.quantidade ?? null,
        localEquipe1: e1?.local ?? null,
        localEquipe2: e2?.local ?? null,
        localEquipe3: e3?.local ?? null,
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
        const entrada = porChave.get(chave(item.id, equipe, lote))
        if (entrada == null) return null
        soma += entrada.quantidade
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
