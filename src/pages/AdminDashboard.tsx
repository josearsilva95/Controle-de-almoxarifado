import { Fragment, useState } from 'react'
import type { MouseEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { usePedidosContext } from '../hooks/usePedidosContext'
import { usePerfis } from '../hooks/usePerfis'
import { usePedidoSessoes } from '../hooks/usePedidoSessoes'
import { UrgenciaBadge } from '../components/UrgenciaBadge'
import { StatusBadge } from '../components/StatusBadge'
import { SessoesTimeline } from '../components/SessoesTimeline'
import { AppShell } from '../components/AppShell'
import { EditarRequisicaoModal } from '../components/EditarRequisicaoModal'
import { classesBotaoIcone } from '../components/ui/Botao'
import { supabase } from '../lib/supabaseClient'
import { formatDataHora } from '../lib/tempo'
import { rotuloDeposito } from '../lib/depositos'
import { rotuloMotivoPausa } from '../lib/motivosPausa'
import type { Pedido } from '../types/database'

export function AdminDashboard() {
  const { profile } = useAuth()
  const { pedidos, carregando } = usePedidosContext()
  const perfis = usePerfis()
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null)
  const [pedidoEditando, setPedidoEditando] = useState<Pedido | null>(null)
  const { sessoes } = usePedidoSessoes(pedidoExpandido)

  if (!profile) return null

  function nomeDe(id: string | null): string {
    if (!id) return '—'
    return perfis[id]?.nome_completo ?? 'Desconhecido'
  }

  function abrirEdicao(pedido: Pedido, evento: MouseEvent) {
    evento.stopPropagation()
    setPedidoEditando(pedido)
  }

  async function excluirPedido(pedido: Pedido, evento: MouseEvent) {
    evento.stopPropagation()
    const confirmado = window.confirm(
      `Excluir a requisição #${pedido.numero_pv}? Essa ação não pode ser desfeita.`
    )
    if (!confirmado) return

    const { error } = await supabase.from('pedidos').delete().eq('id', pedido.id)
    if (error) {
      window.alert(`Não foi possível excluir: ${error.message}`)
    }
  }

  return (
    <AppShell>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Requisições</h2>

      {carregando && <p className="py-8 text-center text-sm text-muted-foreground">Carregando requisições...</p>}
      {!carregando && pedidos.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma requisição cadastrada ainda.</p>
      )}

      {!carregando && pedidos.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Requisição</th>
                <th className="px-3 py-2.5">Cliente</th>
                <th className="px-3 py-2.5">Depósito</th>
                <th className="px-3 py-2.5">Qtd.</th>
                <th className="px-3 py-2.5">Urgência</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Cadastrada em</th>
                <th className="px-3 py-2.5">Iniciada em / por</th>
                <th className="px-3 py-2.5">Finalizada em / por</th>
                <th className="px-3 py-2.5">Entrega</th>
                <th className="px-3 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <Fragment key={pedido.id}>
                  <tr
                    className="cursor-pointer border-t border-border hover:bg-muted/40"
                    onClick={() =>
                      setPedidoExpandido(pedidoExpandido === pedido.id ? null : pedido.id)
                    }
                  >
                    <td className="px-3 py-2.5 font-medium text-card-foreground">#{pedido.numero_pv}</td>
                    <td className="px-3 py-2.5 text-card-foreground">{pedido.cliente}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{rotuloDeposito(pedido.deposito)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{pedido.quantidade_itens}</td>
                    <td className="px-3 py-2.5">
                      <UrgenciaBadge urgencia={pedido.urgencia} />
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge pedido={pedido} />
                      {pedido.status === 'pausado' && pedido.motivo_pausa && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {rotuloMotivoPausa(pedido.motivo_pausa)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDataHora(pedido.created_at)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {pedido.iniciado_em
                        ? `${formatDataHora(pedido.iniciado_em)} · ${nomeDe(pedido.iniciado_por)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {pedido.finalizado_em
                        ? `${formatDataHora(pedido.finalizado_em)} · ${nomeDe(pedido.finalizado_por)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {pedido.entregue_em ? (
                        <>
                          {formatDataHora(pedido.entregue_em)}
                          <br />
                          <span className="text-xs">
                            retirado por {pedido.retirado_por_nome || 'não informado'}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className={classesBotaoIcone()}
                          onClick={(e) => abrirEdicao(pedido, e)}
                          aria-label={`Editar requisição ${pedido.numero_pv}`}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={classesBotaoIcone(true)}
                          onClick={(e) => excluirPedido(pedido, e)}
                          aria-label={`Excluir requisição ${pedido.numero_pv}`}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {pedidoExpandido === pedido.id && (
                    <tr className="border-t border-border bg-muted/20">
                      <td colSpan={11} className="px-4 py-3">
                        <SessoesTimeline sessoes={sessoes} perfis={perfis} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pedidoEditando && (
        <EditarRequisicaoModal
          pedido={pedidoEditando}
          onFechar={() => setPedidoEditando(null)}
          onSalvo={() => setPedidoEditando(null)}
        />
      )}
    </AppShell>
  )
}
