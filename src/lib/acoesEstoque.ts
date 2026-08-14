import { supabase } from './supabaseClient'

interface ResultadoAcao {
  erro: string | null
}

// Grava a contagem (uma linha por item+pessoa — contar de novo atualiza a
// própria linha) e espelha o valor mais recente em estoque_itens.quantidade,
// que é o que a aba de catálogo mostra.
export async function registrarContagem(
  itemId: string,
  quantidade: number,
  usuarioId: string
): Promise<ResultadoAcao> {
  const { error: erroContagem } = await supabase.from('estoque_contagens').upsert(
    { item_id: itemId, quantidade, contado_por: usuarioId, contado_em: new Date().toISOString() },
    { onConflict: 'item_id,contado_por' }
  )
  if (erroContagem) return { erro: erroContagem.message }

  const { error: erroItem } = await supabase.from('estoque_itens').update({ quantidade }).eq('id', itemId)
  if (erroItem) return { erro: erroItem.message }

  return { erro: null }
}
