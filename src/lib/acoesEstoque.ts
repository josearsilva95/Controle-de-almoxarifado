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

// Marca a equipe como tendo finalizado a contagem dela — é o que libera o
// relatório de "itens que essa equipe não chegou a contar" pras outras
// equipes/admin (a comparação de valor divergente já aparece sem isso).
export async function finalizarContagemEquipe(equipe: EquipeEstoque, usuarioId: string): Promise<ResultadoAcao> {
  const { error } = await supabase
    .from('estoque_equipes_status')
    .upsert(
      { equipe, finalizada_em: new Date().toISOString(), finalizada_por: usuarioId },
      { onConflict: 'equipe' }
    )
  if (error) return { erro: error.message }
  return { erro: null }
}

// Reabre a contagem da equipe (desfaz o "finalizar"), caso precisem
// continuar contando depois de ter marcado como pronto por engano.
export async function reabrirContagemEquipe(equipe: EquipeEstoque): Promise<ResultadoAcao> {
  const { error } = await supabase.from('estoque_equipes_status').delete().eq('equipe', equipe)
  if (error) return { erro: error.message }
  return { erro: null }
}
