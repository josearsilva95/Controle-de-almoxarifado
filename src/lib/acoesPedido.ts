import { supabase } from './supabaseClient'
import type { MotivoPausa, Pedido } from '../types/database'

type Resultado = { erro: string | null }

/**
 * Usado tanto para "Iniciar" (pendente -> em_andamento) quanto para "Continuar"
 * (pausado -> em_andamento). iniciado_em/iniciado_por só são gravados na primeira vez.
 * A tentativa de assumir uma PV já em andamento falha aqui via unique constraint
 * (índice único parcial em pedido_sessoes), que é o mecanismo real de exclusividade.
 */
export async function assumirPedido(pedido: Pedido, usuarioId: string): Promise<Resultado> {
  const agora = new Date().toISOString()

  const { error: erroSessao } = await supabase.from('pedido_sessoes').insert({
    pedido_id: pedido.id,
    usuario_id: usuarioId,
    inicio: agora,
  })

  if (erroSessao) {
    if (erroSessao.code === '23505') {
      return { erro: 'Esta tarefa já foi assumida por outro funcionário. Atualizando lista...' }
    }
    return { erro: `Não foi possível iniciar a tarefa: ${erroSessao.message}` }
  }

  const atualizacoes: Record<string, unknown> = {
    status: 'em_andamento',
    funcionario_atual: usuarioId,
    motivo_pausa: null,
  }
  if (!pedido.iniciado_em) {
    atualizacoes.iniciado_em = agora
    atualizacoes.iniciado_por = usuarioId
  }

  const { error: erroPedido } = await supabase.from('pedidos').update(atualizacoes).eq('id', pedido.id)
  if (erroPedido) return { erro: `Não foi possível atualizar o pedido: ${erroPedido.message}` }
  return { erro: null }
}

async function encerrarSessaoAberta(
  pedidoId: string,
  usuarioId: string,
  evento: 'pausa' | 'finalizacao',
  motivoPausa: MotivoPausa | null
): Promise<Resultado> {
  const { data: sessao, error: erroBusca } = await supabase
    .from('pedido_sessoes')
    .select('*')
    .eq('pedido_id', pedidoId)
    .eq('usuario_id', usuarioId)
    .is('fim', null)
    .maybeSingle()

  if (erroBusca || !sessao) {
    return { erro: 'Não foi possível encontrar a sessão em aberto para esta tarefa.' }
  }

  const agora = new Date()
  const duracaoSegundos = Math.round((agora.getTime() - new Date(sessao.inicio).getTime()) / 1000)

  const { error } = await supabase
    .from('pedido_sessoes')
    .update({
      fim: agora.toISOString(),
      duracao_segundos: duracaoSegundos,
      encerrada_por_evento: evento,
      motivo_pausa: motivoPausa,
    })
    .eq('id', sessao.id)

  if (error) return { erro: `Não foi possível encerrar a sessão: ${error.message}` }
  return { erro: null }
}

export async function pausarPedido(
  pedido: Pedido,
  usuarioId: string,
  motivo: MotivoPausa
): Promise<Resultado> {
  const { erro } = await encerrarSessaoAberta(pedido.id, usuarioId, 'pausa', motivo)
  if (erro) return { erro }

  const { error } = await supabase
    .from('pedidos')
    .update({ status: 'pausado', funcionario_atual: null, motivo_pausa: motivo })
    .eq('id', pedido.id)
  if (error) return { erro: `Não foi possível pausar: ${error.message}` }
  return { erro: null }
}

export async function finalizarPedido(pedido: Pedido, usuarioId: string): Promise<Resultado> {
  const { erro } = await encerrarSessaoAberta(pedido.id, usuarioId, 'finalizacao', null)
  if (erro) return { erro }

  const { error } = await supabase
    .from('pedidos')
    .update({
      status: 'finalizado',
      finalizado_em: new Date().toISOString(),
      finalizado_por: usuarioId,
      funcionario_atual: null,
      motivo_pausa: null,
    })
    .eq('id', pedido.id)
  if (error) return { erro: `Não foi possível finalizar: ${error.message}` }
  return { erro: null }
}
