import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Profile } from '../types/database'

export function usePerfis() {
  const [perfis, setPerfis] = useState<Record<string, Profile>>({})

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*')
    if (error) {
      console.error('Erro ao carregar perfis:', error.message)
      return
    }
    if (data) {
      const mapa: Record<string, Profile> = {}
      for (const perfil of data) mapa[perfil.id] = perfil
      setPerfis(mapa)
    }
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { perfis, recarregar }
}
