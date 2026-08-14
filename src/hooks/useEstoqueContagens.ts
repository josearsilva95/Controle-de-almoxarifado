import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EstoqueContagem } from '../types/database'

const TAMANHO_PAGINA = 1000

// Carrega tudo paginado (mesmo motivo do useEstoque: uma query só some numa
// tabela grande) e depois assina Realtime pra refletir contagens de outras
// equipes/pessoas sem precisar recarregar a página.
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

    const canal = supabase
      .channel('estoque-contagens-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'estoque_contagens' },
        (payload) => {
          setContagens((atual) => {
            if (payload.eventType === 'INSERT') {
              const nova = payload.new as EstoqueContagem
              if (atual.some((c) => c.id === nova.id)) return atual
              return [nova, ...atual]
            }
            if (payload.eventType === 'UPDATE') {
              const atualizada = payload.new as EstoqueContagem
              return atual.map((c) => (c.id === atualizada.id ? atualizada : c))
            }
            if (payload.eventType === 'DELETE') {
              const removida = payload.old as EstoqueContagem
              return atual.filter((c) => c.id !== removida.id)
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
  }, [recarregar])

  return { contagens, carregando, recarregar }
}
