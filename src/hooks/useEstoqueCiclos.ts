import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EstoqueCiclo, EstoqueCicloItemComItem } from '../types/database'

// Só busca/gera nada se o usuário tiver acesso ao Estoque — evita erro de
// RLS pra todo mundo que só usa Requisições.
export function useEstoqueCiclos(temAcesso: boolean) {
  const [ciclo, setCiclo] = useState<EstoqueCiclo | null>(null)
  const [itens, setItens] = useState<EstoqueCicloItemComItem[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    if (!temAcesso) {
      setCarregando(false)
      return
    }
    const hoje = new Date().toISOString().slice(0, 10)
    const { data: cicloData, error: erroCiclo } = await supabase
      .from('estoque_ciclos')
      .select('*')
      .eq('data_referencia', hoje)
      .maybeSingle()
    if (erroCiclo) {
      console.error('Erro ao carregar ciclo de hoje:', erroCiclo.message)
      setCarregando(false)
      return
    }
    setCiclo(cicloData)
    if (!cicloData) {
      setItens([])
      setCarregando(false)
      return
    }
    const { data: itensData, error: erroItens } = await supabase
      .from('estoque_ciclos_itens')
      .select('*, item:estoque_itens(*)')
      .eq('ciclo_id', cicloData.id)
    if (erroItens) {
      console.error('Erro ao carregar itens do ciclo:', erroItens.message)
    } else {
      setItens((itensData ?? []) as unknown as EstoqueCicloItemComItem[])
    }
    setCarregando(false)
  }, [temAcesso])

  // Gera o ciclo do dia (se ainda não existir) assim que alguém com acesso
  // abre o app — sem depender de agendador externo. gerar_ciclo_hoje() no
  // banco garante que só um ciclo é criado por dia, mesmo com duas pessoas
  // abrindo ao mesmo tempo.
  useEffect(() => {
    if (!temAcesso) {
      setCarregando(false)
      return
    }
    let ativo = true

    async function iniciar() {
      const { error } = await supabase.rpc('gerar_ciclo_hoje')
      if (error) console.error('Erro ao gerar ciclo do dia:', error.message)
      if (ativo) recarregar()
    }
    iniciar()

    const canal = supabase
      .channel('estoque-ciclos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_ciclos' }, () => recarregar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_ciclos_itens' }, () => recarregar())
      .subscribe()

    return () => {
      ativo = false
      supabase.removeChannel(canal)
    }
  }, [temAcesso, recarregar])

  return { ciclo, itens, carregando, recarregar }
}
