import type { CSSProperties } from 'react'
import { corDoStatus, rotuloStatus } from '../lib/cores'
import type { Pedido } from '../types/database'

export function StatusBadge({ pedido }: { pedido: Pick<Pedido, 'status' | 'urgencia'> }) {
  const clara = pedido.status === 'pendente' && pedido.urgencia === 'nao_urgente'
  return (
    <span
      className={`badge${clara ? ' badge-clara' : ''}`}
      style={{ '--cor-status': corDoStatus(pedido) } as CSSProperties}
    >
      {rotuloStatus(pedido.status)}
    </span>
  )
}
