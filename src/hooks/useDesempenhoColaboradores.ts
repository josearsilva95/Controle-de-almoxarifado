import { useMemo } from 'react'
import { usePedidos } from './usePedidos'
import { usePerfis } from './usePerfis'
import { useTodasSessoes } from './useTodasSessoes'
import { tempoPorUsuario } from '../lib/tempo'
import type { Role } from '../types/database'

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

export function useDesempenhoColaboradores() {
  const { pedidos, carregando: carregandoPedidos } = usePedidos()
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

  return { desempenho, carregando: carregandoPedidos || carregandoSessoes }
}
