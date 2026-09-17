import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Limite do plano Free do Supabase (banco de dados Postgres).
export const LIMITE_BANCO_MB = 500

const CINCO_MINUTOS = 5 * 60 * 1000

export function useUsoBanco() {
  const [usadoMb, setUsadoMb] = useState<number | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      const { data, error } = await supabase.rpc('tamanho_banco_bytes')
      if (!ativo || error || data == null) return
      setUsadoMb(Number(data) / (1024 * 1024))
    }

    carregar()
    const intervalo = setInterval(carregar, CINCO_MINUTOS)
    return () => {
      ativo = false
      clearInterval(intervalo)
    }
  }, [])

  return { usadoMb }
}
