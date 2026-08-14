import { CORES, corDoStatus, rotuloStatus } from '../lib/cores'
import type { Pedido } from '../types/database'

export function StatusBadge({ pedido }: { pedido: Pick<Pedido, 'status' | 'urgencia' | 'entregue_em'> }) {
  const aguardandoRetirada = pedido.status === 'finalizado' && !pedido.entregue_em
  const clara = !aguardandoRetirada && pedido.status === 'pendente' && pedido.urgencia === 'nao_urgente'
  const cor = aguardandoRetirada ? CORES.aguardando_retirada : corDoStatus(pedido)
  const texto = aguardandoRetirada
    ? 'Aguardando retirada'
    : pedido.status === 'finalizado'
      ? 'Entregue'
      : rotuloStatus(pedido.status)

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        clara ? 'border border-border text-foreground' : ''
      }`}
      style={clara ? undefined : { backgroundColor: `${cor}1f`, color: cor }}
    >
      {texto}
    </span>
  )
}
