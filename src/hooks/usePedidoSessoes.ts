import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { PedidoSessao } from '../types/database'

export function usePedidoSessoes(pedidoId: string | null) {
  const [sessoes, setSessoes] = useState<PedidoSessao[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!pedidoId) {
      setSessoes([])
      return
    }

    let ativo = true
    setCarregando(true)

    supabase
      .from('pedido_sessoes')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('inicio', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Erro ao carregar sessões:', error.message)
        if (ativo && data) setSessoes(data)
        if (ativo) setCarregando(false)
      })

    const canal = supabase
      .channel(`sessoes-${pedidoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedido_sessoes', filter: `pedido_id=eq.${pedidoId}` },
        (payload) => {
          setSessoes((atual) => {
            if (payload.eventType === 'INSERT') {
              const nova = payload.new as PedidoSessao
              if (atual.some((s) => s.id === nova.id)) return atual
              return [...atual, nova].sort(
                (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
              )
            }
            if (payload.eventType === 'UPDATE') {
              const atualizada = payload.new as PedidoSessao
              return atual.map((s) => (s.id === atualizada.id ? atualizada : s))
            }
            if (payload.eventType === 'DELETE') {
              const removida = payload.old as PedidoSessao
              return atual.filter((s) => s.id !== removida.id)
            }
            return atual
          })
        }
      )
      .subscribe()

    return () => {
      ativo = false
      supabase.removeChannel(canal)
    }
  }, [pedidoId])

  return { sessoes, carregando }
}
