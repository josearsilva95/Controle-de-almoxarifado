import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EstoqueContagem } from '../types/database'

const TAMANHO_PAGINA = 1000

export function useEstoqueContagens() {
  const [contagens, setContagens] = useState<EstoqueContagem[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    const todas: EstoqueContagem[] = []
    let pagina = 0
    while (true) {
      const inicio = pagina * TAMANHO_PAGINA
      const { data, error } = await supabase
        .from('estoque_contagens')
        .select('*')
        .order('contado_em', { ascending: false })
        .range(inicio, inicio + TAMANHO_PAGINA - 1)
      if (error) {
        console.error('Erro ao carregar contagens:', error.message)
        break
      }
      todas.push(...(data ?? []))
      if (!data || data.length < TAMANHO_PAGINA) break
      pagina++
    }
    setContagens(todas)
  }, [])

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    recarregar().finally(() => {
      if (ativo) setCarregando(false)
    })
    return () => {
      ativo = false
    }
  }, [recarregar])

  return { contagens, carregando, recarregar }
}
