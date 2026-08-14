import { supabase } from './supabaseClient'
import type { EquipeEstoque } from '../types/database'

interface ResultadoAcao {
  erro: string | null
}

// Grava a contagem da equipe pra um item — uma linha por (item, equipe);
// contar de novo pela mesma equipe atualiza a própria linha em vez de
// duplicar. Não mexe em estoque_itens.quantidade — esse campo é a
// quantidade oficial do sistema (importada), fica intacto pra comparação.
export async function registrarContagem(
  itemId: string,
  equipe: EquipeEstoque,
  quantidade: number,
  usuarioId: string
): Promise<ResultadoAcao> {
  const { error } = await supabase.from('estoque_contagens').upsert(
    { item_id: itemId, equipe, quantidade, contado_por: usuarioId, contado_em: new Date().toISOString() },
    { onConflict: 'item_id,equipe' }
  )
  if (error) return { erro: error.message }
  return { erro: null }
}
