import type { ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { podeAcessarEstoque } from '../lib/permissoes'
import { useEstoqueCiclos } from './useEstoqueCiclos'
import { EstoqueCiclosContext } from './estoqueCiclosContextObject'

// Mesmo motivo do PedidosProvider: o alerta flutuante (dentro de AppShell)
// e a tela de contagem cíclica (dentro da página Estoque) precisam dos
// mesmos dados — se cada um chamar useEstoqueCiclos() direto, duas
// instâncias competem pelo canal Realtime "estoque-ciclos-changes". Fica em
// App.tsx, envolvendo as <Routes>, pelo mesmo motivo descrito lá no
// PedidosProvider.
export function EstoqueCiclosProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const value = useEstoqueCiclos(podeAcessarEstoque(profile))
  return <EstoqueCiclosContext.Provider value={value}>{children}</EstoqueCiclosContext.Provider>
}
