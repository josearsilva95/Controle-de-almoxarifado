import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Profile } from '../types/database'

export function usePerfis() {
  const [perfis, setPerfis] = useState<Record<string, Profile>>({})

  useEffect(() => {
    let ativo = true
    supabase
      .from('profiles')
      .select('*')
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao carregar perfis:', error.message)
          return
        }
        if (ativo && data) {
          const mapa: Record<string, Profile> = {}
          for (const perfil of data) mapa[perfil.id] = perfil
          setPerfis(mapa)
        }
      })
    return () => {
      ativo = false
    }
  }, [])

  return perfis
}
