import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EstoqueItem } from '../types/database'

export function useEstoque() {
  const [itens, setItens] = useState<EstoqueItem[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from('estoque_itens').select('*').order('codigo')
    if (error) {
      console.error('Erro ao carregar estoque:', error.message)
      return
    }
    setItens(data ?? [])
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

  return { itens, carregando, recarregar }
}
