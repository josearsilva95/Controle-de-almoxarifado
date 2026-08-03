import { corDoStatus, rotuloStatus } from '../lib/cores'
import type { Pedido } from '../types/database'

export function StatusBadge({ pedido }: { pedido: Pick<Pedido, 'status' | 'urgencia'> }) {
  const clara = pedido.status === 'pendente' && pedido.urgencia === 'nao_urgente'
  const cor = corDoStatus(pedido)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        clara ? 'border border-border text-foreground' : ''
      }`}
      style={clara ? undefined : { backgroundColor: `${cor}1f`, color: cor }}
    >
      {rotuloStatus(pedido.status)}
    </span>
  )
}
