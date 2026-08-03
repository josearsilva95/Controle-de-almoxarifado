import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Pedido } from '../types/database'

export function usePedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Erro ao carregar pedidos:', error.message)
      } else if (ativo && data) {
        setPedidos(data)
      }
      if (ativo) setCarregando(false)
    }

    carregar()

    const canal = supabase
      .channel('pedidos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        (payload) => {
          setPedidos((atual) => {
            if (payload.eventType === 'INSERT') {
              const novo = payload.new as Pedido
              if (atual.some((p) => p.id === novo.id)) return atual
              return [novo, ...atual]
            }
            if (payload.eventType === 'UPDATE') {
              const atualizado = payload.new as Pedido
              return atual.map((p) => (p.id === atualizado.id ? atualizado : p))
            }
            if (payload.eventType === 'DELETE') {
              const removido = payload.old as Pedido
              return atual.filter((p) => p.id !== removido.id)
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

  return { pedidos, carregando }
}
