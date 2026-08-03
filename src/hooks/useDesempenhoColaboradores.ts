import { useMemo } from 'react'
import { usePerfis } from './usePerfis'
import { useTodasSessoes } from './useTodasSessoes'
import { tempoPorUsuario } from '../lib/tempo'
import type { Pedido, Role } from '../types/database'

export interface DesempenhoColaborador {
  usuarioId: string
  nome: string
  role: Role
  requisicoesFinalizadas: number
  requisicoesFinalizadasMes: number
  tempoTotalSegundos: number
}

function mesmoMes(iso: string, agora: Date): boolean {
  const data = new Date(iso)
  return data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth()
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

    return Object.values(perfis)
      .map((perfil) => {
        const finalizados = pedidos.filter((p) => p.status === 'finalizado' && p.finalizado_por === perfil.id)
        const finalizadosMes = finalizados.filter((p) => p.finalizado_em && mesmoMes(p.finalizado_em, agora))
        return {
          usuarioId: perfil.id,
          nome: perfil.nome_completo,
          role: perfil.role,
          requisicoesFinalizadas: finalizados.length,
          requisicoesFinalizadasMes: finalizadosMes.length,
          tempoTotalSegundos: tempoPorId.get(perfil.id) ?? 0,
        }
      })
      .sort((a, b) => b.requisicoesFinalizadas - a.requisicoesFinalizadas)
  }, [pedidos, sessoes, perfis])

  return { desempenho, carregando: carregandoSessoes }
}
