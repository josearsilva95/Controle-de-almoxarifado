import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EstoqueLocal } from '../types/database'

export function useEstoqueLocais() {
  const [locais, setLocais] = useState<EstoqueLocal[]>([])

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from('estoque_locais').select('*').order('codigo')
    if (error) {
      console.error('Erro ao carregar locais:', error.message)
      return
    }
    setLocais(data ?? [])
  }, [])

  useEffect(() => {
    recarregar()

    const canal = supabase
      .channel('estoque-locais-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_locais' }, () => recarregar())
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [recarregar])

  return { locais, recarregar }
}
