import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EstoqueItem } from '../types/database'

// O Supabase (PostgREST) limita cada resposta a 1000 linhas por padrão — com
// milhares de itens de estoque, uma única query traz só a primeira página em
// ordem alfabética. Pagina com .range() até uma página vir incompleta.
const TAMANHO_PAGINA = 1000

export function useEstoque() {
  const [itens, setItens] = useState<EstoqueItem[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    const todos: EstoqueItem[] = []
    let pagina = 0
    while (true) {
      const inicio = pagina * TAMANHO_PAGINA
      const { data, error } = await supabase
        .from('estoque_itens')
        .select('*')
        .order('codigo')
        .range(inicio, inicio + TAMANHO_PAGINA - 1)
      if (error) {
        console.error('Erro ao carregar estoque:', error.message)
        break
      }
      todos.push(...(data ?? []))
      if (!data || data.length < TAMANHO_PAGINA) break
      pagina++
    }
    setItens(todos)
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
