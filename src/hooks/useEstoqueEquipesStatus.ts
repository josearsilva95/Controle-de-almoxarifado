import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EstoqueEquipeStatus } from '../types/database'

export function useEstoqueEquipesStatus() {
  const [status, setStatus] = useState<EstoqueEquipeStatus[]>([])

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from('estoque_equipes_status').select('*')
    if (error) {
      console.error('Erro ao carregar status das equipes:', error.message)
      return
    }
    setStatus(data ?? [])
  }, [])

  useEffect(() => {
    recarregar()

    const canal = supabase
      .channel('estoque-equipes-status-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'estoque_equipes_status' },
        (payload) => {
          setStatus((atual) => {
            if (payload.eventType === 'DELETE') {
              const removido = payload.old as EstoqueEquipeStatus
              return atual.filter((s) => s.equipe !== removido.equipe)
            }
            const novo = payload.new as EstoqueEquipeStatus
            const semAntigo = atual.filter((s) => s.equipe !== novo.equipe)
            return [...semAntigo, novo]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [recarregar])

  return { status, recarregar }
}
