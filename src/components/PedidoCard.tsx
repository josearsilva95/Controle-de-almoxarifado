import type { CSSProperties } from 'react'
import { corDoStatus } from '../lib/cores'
import { formatDataHora } from '../lib/tempo'
import { StatusBadge } from './StatusBadge'
import { UrgenciaBadge } from './UrgenciaBadge'
import type { Pedido, Profile } from '../types/database'

interface PedidoCardProps {
  pedido: Pedido
  perfis: Record<string, Profile>
  usuarioAtualId: string
  processando: boolean
  onIniciar: (pedido: Pedido) => void
  onPausar: (pedido: Pedido) => void
  onContinuar: (pedido: Pedido) => void
  onFinalizar: (pedido: Pedido) => void
}

function nomeDe(perfis: Record<string, Profile>, id: string | null): string {
  if (!id) return '—'
  return perfis[id]?.nome_completo ?? 'Desconhecido'
}

export function PedidoCard({
  pedido,
  perfis,
  usuarioAtualId,
  processando,
  onIniciar,
  onPausar,
  onContinuar,
  onFinalizar,
}: PedidoCardProps) {
  const souEuQueEstouTrabalhando = pedido.funcionario_atual === usuarioAtualId

  return (
    <div className="cartao-pedido" style={{ '--cor-status': corDoStatus(pedido) } as CSSProperties}>
      <div className="cartao-pedido-cabecalho">
        <span className="cartao-pedido-pv">PV {pedido.numero_pv}</span>
        <StatusBadge pedido={pedido} />
      </div>
      <div className="cartao-pedido-cliente">{pedido.cliente}</div>
      <div style={{ marginBottom: 10 }}>
        <UrgenciaBadge urgencia={pedido.urgencia} />
      </div>
      <div className="cartao-pedido-meta">
        <div>Cadastrado em: {formatDataHora(pedido.created_at)}</div>
        {pedido.iniciado_em && (
          <div>
            Iniciado em: {formatDataHora(pedido.iniciado_em)} por {nomeDe(perfis, pedido.iniciado_por)}
          </div>
        )}
        {pedido.status === 'em_andamento' && (
          <div>Em andamento com: {nomeDe(perfis, pedido.funcionario_atual)}</div>
        )}
        {pedido.status === 'finalizado' && pedido.finalizado_em && (
          <div>
            Finalizado em: {formatDataHora(pedido.finalizado_em)} por{' '}
            {nomeDe(perfis, pedido.finalizado_por)}
          </div>
        )}
      </div>
      <div className="botoes-acao">
        {pedido.status === 'pendente' && (
          <button onClick={() => onIniciar(pedido)} disabled={processando}>
            Iniciar
          </button>
        )}
        {pedido.status === 'em_andamento' && souEuQueEstouTrabalhando && (
          <>
            <button className="secundario" onClick={() => onPausar(pedido)} disabled={processando}>
              Pausar
            </button>
            <button onClick={() => onFinalizar(pedido)} disabled={processando}>
              Finalizar
            </button>
          </>
        )}
        {pedido.status === 'em_andamento' && !souEuQueEstouTrabalhando && (
          <span className="mensagem-vazio" style={{ padding: 0 }}>
            Já está sendo separado por outro funcionário
          </span>
        )}
        {pedido.status === 'pausado' && (
          <button onClick={() => onContinuar(pedido)} disabled={processando}>
            Continuar
          </button>
        )}
      </div>
    </div>
  )
}
