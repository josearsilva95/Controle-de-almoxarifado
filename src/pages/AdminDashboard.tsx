import { Fragment, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { usePedidos } from '../hooks/usePedidos'
import { usePerfis } from '../hooks/usePerfis'
import { usePedidoSessoes } from '../hooks/usePedidoSessoes'
import { UrgenciaBadge } from '../components/UrgenciaBadge'
import { StatusBadge } from '../components/StatusBadge'
import { SessoesTimeline } from '../components/SessoesTimeline'
import { AppShell } from '../components/AppShell'
import { formatDataHora } from '../lib/tempo'

export function AdminDashboard() {
  const { profile } = useAuth()
  const { pedidos, carregando } = usePedidos()
  const perfis = usePerfis()
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null)
  const { sessoes } = usePedidoSessoes(pedidoExpandido)

  if (!profile) return null

  function nomeDe(id: string | null): string {
    if (!id) return '—'
    return perfis[id]?.nome_completo ?? 'Desconhecido'
  }

  return (
    <AppShell>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Requisições</h2>

      {carregando && <p className="py-8 text-center text-sm text-muted-foreground">Carregando requisições...</p>}
      {!carregando && pedidos.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma requisição cadastrada ainda.</p>
      )}

      {!carregando && pedidos.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Requisição</th>
                <th className="px-3 py-2.5">Cliente</th>
                <th className="px-3 py-2.5">Urgência</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Cadastrada em</th>
                <th className="px-3 py-2.5">Iniciada em / por</th>
                <th className="px-3 py-2.5">Finalizada em / por</th>
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
                    <td className="px-3 py-2.5">
                      <UrgenciaBadge urgencia={pedido.urgencia} />
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge pedido={pedido} />
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
                  </tr>
                  {pedidoExpandido === pedido.id && (
                    <tr className="border-t border-border bg-muted/20">
                      <td colSpan={7} className="px-4 py-3">
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
    </AppShell>
  )
}
