import type { ReactNode } from 'react'
import { usePedidos } from './usePedidos'
import { PedidosContext } from './pedidosContextObject'

/**
 * Ponto único de assinatura do Realtime "pedidos-changes" para o app inteiro.
 * Várias páginas/telas precisam de `pedidos` (Requisições, Relatórios,
 * Colaboradores, alerta de empilhadeira) — se cada uma chamar usePedidos()
 * direto, duas instâncias competem pelo mesmo canal e uma delas quebra ao
 * registrar listeners depois que a outra já chamou subscribe() (já aconteceu:
 * foi o bug que derrubava a aba Relatórios). Este Provider garante que só
 * existe uma instância do hook, e todo o resto consome via usePedidosContext().
 *
 * Fica em App.tsx, envolvendo as <Routes> — não dentro de AppShell.tsx.
 * AppShell é renderizado pelas próprias páginas (ex: AdminDashboard faz
 * `return <AppShell>...</AppShell>`), então as chamadas a usePedidosContext()
 * no corpo dessas páginas rodam ANTES/ACIMA de AppShell na árvore — um
 * Provider dentro de AppShell nunca alcançaria essas chamadas.
 */
export function PedidosProvider({ children }: { children: ReactNode }) {
  const value = usePedidos()
  return <PedidosContext.Provider value={value}>{children}</PedidosContext.Provider>
}
