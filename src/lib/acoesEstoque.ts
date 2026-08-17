import { supabase } from './supabaseClient'
import type { EquipeEstoque } from '../types/database'

interface ResultadoAcao {
  erro: string | null
}

// Grava a contagem da equipe pra um item/lote — uma linha por (item, equipe,
// lote); contar de novo pela mesma equipe/lote atualiza a própria linha em
// vez de duplicar. lote é '' quando o item não tem lote múltiplo (ver
// src/lib/lotesItem.ts). local é o código de estoque_locais bipado no
// momento (onde a equipe achou o item fisicamente), pra mapear o
// almoxarifado. Não mexe em estoque_itens.quantidade — esse campo é a
// quantidade oficial do sistema (importada), fica intacto pra comparação.
export async function registrarContagem(
  itemId: string,
  equipe: EquipeEstoque,
  lote: string,
  quantidade: number,
  usuarioId: string,
  local: string | null
): Promise<ResultadoAcao> {
  const { error } = await supabase.from('estoque_contagens').upsert(
    { item_id: itemId, equipe, lote, local, quantidade, contado_por: usuarioId, contado_em: new Date().toISOString() },
    { onConflict: 'item_id,equipe,lote' }
  )
  if (error) return { erro: error.message }
  return { erro: null }
}

// Cadastra um novo código de local (etiqueta de prateleira/nível/lado) pra
// poder ser bipado durante a contagem.
export async function criarLocal(codigo: string, rotulo: string | null): Promise<ResultadoAcao> {
  const { error } = await supabase
    .from('estoque_locais')
    .insert({ codigo: codigo.trim(), rotulo: rotulo?.trim() || null })
  if (error) return { erro: error.message }
  return { erro: null }
}

export async function excluirLocal(id: string): Promise<ResultadoAcao> {
  const { error } = await supabase.from('estoque_locais').delete().eq('id', id)
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

// Zera todos os lançamentos de contagem e o status de finalização das
// equipes, pra começar uma auditoria de inventário do zero. Não mexe no
// catálogo (estoque_itens) — só na contagem em cima dele.
export async function reiniciarInventario(): Promise<ResultadoAcao> {
  const { error: erroContagens } = await supabase
    .from('estoque_contagens')
    .delete()
    .not('id', 'is', null)
  if (erroContagens) return { erro: erroContagens.message }

  const { error: erroStatus } = await supabase
    .from('estoque_equipes_status')
    .delete()
    .not('equipe', 'is', null)
  if (erroStatus) return { erro: erroStatus.message }

  return { erro: null }
}
