import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { PedidoSessao } from '../types/database'

export function useTodasSessoes() {
  const [sessoes, setSessoes] = useState<PedidoSessao[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    supabase
      .from('pedido_sessoes')
      .select('*')
      .then(({ data, error }) => {
        if (error) console.error('Erro ao carregar sessões:', error.message)
        if (ativo && data) setSessoes(data)
        if (ativo) setCarregando(false)
      })

    const canal = supabase
      .channel('todas-sessoes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedido_sessoes' },
        (payload) => {
          setSessoes((atual) => {
            if (payload.eventType === 'INSERT') {
              const nova = payload.new as PedidoSessao
              if (atual.some((s) => s.id === nova.id)) return atual
              return [...atual, nova]
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
  }, [])

  return { sessoes, carregando }
}
