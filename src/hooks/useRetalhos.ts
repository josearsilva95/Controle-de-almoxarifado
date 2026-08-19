import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Retalho } from '../types/database'

export function useRetalhos() {
  const [retalhos, setRetalhos] = useState<Retalho[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from('retalhos').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error('Erro ao carregar retalhos:', error.message)
      setCarregando(false)
      return
    }
    setRetalhos(data ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    recarregar()

    const canal = supabase
      .channel('retalhos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retalhos' }, () => recarregar())
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [recarregar])

  return { retalhos, carregando, recarregar }
}
