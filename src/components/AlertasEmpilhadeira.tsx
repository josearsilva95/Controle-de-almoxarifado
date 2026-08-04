import { Forklift } from 'lucide-react'
import { usePedidosContext } from '../hooks/usePedidosContext'

/**
 * Pilha de cards flutuantes no canto direito da tela, um por requisição
 * pausada por falta de empilhadeira. Não usa timer: a lista vem direto do
 * array reativo de `pedidos` (via Realtime), então quando a requisição é
 * retomada ou finalizada ela sai do filtro e o card correspondente
 * desmonta sozinho.
 */
export function AlertasEmpilhadeira() {
  const { pedidos } = usePedidosContext()
  const alertas = pedidos.filter((p) => p.status === 'pausado' && p.motivo_pausa === 'empilhadeira')

  if (alertas.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-72 flex-col gap-2">
      {alertas.map((pedido) => (
        <div
          key={pedido.id}
          className="pointer-events-auto flex items-start gap-3 rounded-lg border border-destructive/30 bg-card p-3 shadow-lg"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Forklift className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-card-foreground">Empilhadeira necessária</p>
            <p className="truncate text-xs text-muted-foreground">
              Requisição #{pedido.numero_pv} · {pedido.cliente}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
