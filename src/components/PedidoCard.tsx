import { corDoStatus } from '../lib/cores'
import { formatDataHora } from '../lib/tempo'
import { rotuloDeposito } from '../lib/depositos'
import { rotuloMotivoPausa } from '../lib/motivosPausa'
import { StatusBadge } from './StatusBadge'
import { UrgenciaBadge } from './UrgenciaBadge'
import { Botao } from './ui/Botao'
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
  onEntregar: (pedido: Pedido) => void
  modoSelecao?: boolean
  selecionado?: boolean
  onToggleSelecao?: (pedido: Pedido) => void
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
  onEntregar,
  modoSelecao = false,
  selecionado = false,
  onToggleSelecao,
}: PedidoCardProps) {
  const souEuQueEstouTrabalhando = pedido.funcionario_atual === usuarioAtualId
  const podeSelecionar = modoSelecao && pedido.status === 'pendente' && onToggleSelecao

  return (
    <div
      className={`rounded-xl border bg-card p-5 transition-colors ${
        selecionado ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      } ${podeSelecionar ? 'cursor-pointer' : ''}`}
      style={{ borderLeft: `6px solid ${corDoStatus(pedido)}` }}
      onClick={podeSelecionar ? () => onToggleSelecao(pedido) : undefined}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-lg font-bold text-card-foreground">Requisição #{pedido.numero_pv}</span>
        <div className="flex items-center gap-2">
          {podeSelecionar && (
            <input
              type="checkbox"
              checked={selecionado}
              onChange={() => onToggleSelecao(pedido)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 accent-primary"
              aria-label={`Selecionar requisição ${pedido.numero_pv}`}
            />
          )}
          <StatusBadge pedido={pedido} />
        </div>
      </div>
      <div className="mb-2.5 text-sm text-muted-foreground">{pedido.cliente}</div>
      <div className="mb-3">
        <UrgenciaBadge urgencia={pedido.urgencia} />
      </div>
      <div className="mb-3 space-y-0.5 text-xs text-muted-foreground">
        <div>
          {rotuloDeposito(pedido.deposito)} · {pedido.quantidade_itens}{' '}
          {pedido.quantidade_itens === 1 ? 'item' : 'itens'}
        </div>
        <div>Cadastrada em: {formatDataHora(pedido.created_at)}</div>
        {pedido.iniciado_em && (
          <div>
            Iniciada em: {formatDataHora(pedido.iniciado_em)} por {nomeDe(perfis, pedido.iniciado_por)}
          </div>
        )}
        {pedido.status === 'em_andamento' && (
          <div>Em andamento com: {nomeDe(perfis, pedido.funcionario_atual)}</div>
        )}
        {pedido.status === 'pausado' && pedido.motivo_pausa && (
          <div>Pausada por: {rotuloMotivoPausa(pedido.motivo_pausa)}</div>
        )}
        {pedido.status === 'finalizado' && pedido.finalizado_em && (
          <div>
            Finalizada em: {formatDataHora(pedido.finalizado_em)} por{' '}
            {nomeDe(perfis, pedido.finalizado_por)}
          </div>
        )}
        {pedido.entregue_em && (
          <div>
            Entregue em: {formatDataHora(pedido.entregue_em)} · retirado por{' '}
            {pedido.retirado_por_nome || 'não informado'} · registrado por{' '}
            {nomeDe(perfis, pedido.entregue_por)}
          </div>
        )}
      </div>
      {!modoSelecao && (
        <div className="flex flex-wrap items-center gap-2">
          {pedido.status === 'pendente' && (
            <Botao tamanho="sm" onClick={() => onIniciar(pedido)} disabled={processando}>
              Iniciar
            </Botao>
          )}
          {pedido.status === 'em_andamento' && souEuQueEstouTrabalhando && (
            <>
              <Botao variante="secundaria" tamanho="sm" onClick={() => onPausar(pedido)} disabled={processando}>
                Pausar
              </Botao>
              <Botao tamanho="sm" onClick={() => onFinalizar(pedido)} disabled={processando}>
                Finalizar
              </Botao>
            </>
          )}
          {pedido.status === 'em_andamento' && !souEuQueEstouTrabalhando && (
            <span className="text-sm text-muted-foreground">
              Já está sendo separada por outro funcionário
            </span>
          )}
          {pedido.status === 'pausado' && (
            <Botao tamanho="sm" onClick={() => onContinuar(pedido)} disabled={processando}>
              Continuar
            </Botao>
          )}
          {pedido.status === 'finalizado' && !pedido.entregue_em && (
            <Botao tamanho="sm" onClick={() => onEntregar(pedido)} disabled={processando}>
              Marcar como entregue
            </Botao>
          )}
        </div>
      )}
    </div>
  )
}
