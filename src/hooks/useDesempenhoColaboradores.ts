import { useMemo } from 'react'
import { usePerfis } from './usePerfis'
import { useTodasSessoes } from './useTodasSessoes'
import { tempoPorUsuario } from '../lib/tempo'
import type { Pedido, PedidoSessao, Role } from '../types/database'

export interface DesempenhoColaborador {
  usuarioId: string
  nome: string
  role: Role
  requisicoesFinalizadas: number
  requisicoesFinalizadasMes: number
  tempoTotalSegundos: number
  tempoMedioPorRequisicaoSegundos: number
  tempoOciosoSegundos: number
}

function mesmoMes(iso: string, agora: Date): boolean {
  const data = new Date(iso)
  return data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth()
}

function mesmoDia(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

/**
 * Tempo parado entre uma separação e a próxima, só contando intervalos dentro do
 * mesmo dia (evita contar "foi embora à noite e voltou de manhã" como ócio).
 * Proxy de tempo ocioso — não sabemos o horário do turno, só os intervalos entre
 * sessões de trabalho já registradas.
 */
function tempoOciosoPorUsuario(sessoes: PedidoSessao[]): Map<string, number> {
  const porUsuario = new Map<string, PedidoSessao[]>()
  for (const sessao of sessoes) {
    if (!sessao.fim) continue
    const lista = porUsuario.get(sessao.usuario_id) ?? []
    lista.push(sessao)
    porUsuario.set(sessao.usuario_id, lista)
  }

  const resultado = new Map<string, number>()
  for (const [usuarioId, lista] of porUsuario) {
    const ordenada = [...lista].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    let ocioso = 0
    for (let i = 1; i < ordenada.length; i++) {
      const fimAnterior = ordenada[i - 1].fim!
      const inicioAtual = ordenada[i].inicio
      if (!mesmoDia(fimAnterior, inicioAtual)) continue
      const gap = (new Date(inicioAtual).getTime() - new Date(fimAnterior).getTime()) / 1000
      if (gap > 0) ocioso += gap
    }
    resultado.set(usuarioId, ocioso)
  }
  return resultado
}

/**
 * Recebe `pedidos` de fora (em vez de buscar com usePedidos() aqui dentro) para evitar que duas
 * instâncias do hook usePedidos() na mesma página disputem o mesmo canal Realtime
 * ("pedidos-changes") — a segunda tentativa de registrar listeners depois que a primeira já
 * chamou subscribe() derruba a árvore React inteira (o Supabase reusa o canal por nome e lança
 * erro ao adicionar callbacks pós-subscribe).
 */
export function useDesempenhoColaboradores(pedidos: Pedido[]) {
  const { sessoes, carregando: carregandoSessoes } = useTodasSessoes()
  const perfis = usePerfis()

  const desempenho = useMemo<DesempenhoColaborador[]>(() => {
    const agora = new Date()
    const tempoPorId = new Map(tempoPorUsuario(sessoes, agora.getTime()).map((t) => [t.usuarioId, t.totalSegundos]))
    const ociosoPorId = tempoOciosoPorUsuario(sessoes)

    return Object.values(perfis)
      .map((perfil) => {
        const finalizados = pedidos.filter((p) => p.status === 'finalizado' && p.finalizado_por === perfil.id)
        const finalizadosMes = finalizados.filter((p) => p.finalizado_em && mesmoMes(p.finalizado_em, agora))
        const tempoTotalSegundos = tempoPorId.get(perfil.id) ?? 0
        return {
          usuarioId: perfil.id,
          nome: perfil.nome_completo,
          role: perfil.role,
          requisicoesFinalizadas: finalizados.length,
          requisicoesFinalizadasMes: finalizadosMes.length,
          tempoTotalSegundos,
          tempoMedioPorRequisicaoSegundos: finalizados.length
            ? tempoTotalSegundos / finalizados.length
            : 0,
          tempoOciosoSegundos: ociosoPorId.get(perfil.id) ?? 0,
        }
      })
      .sort((a, b) => b.requisicoesFinalizadas - a.requisicoesFinalizadas)
  }, [pedidos, sessoes, perfis])

  return { desempenho, carregando: carregandoSessoes }
}
