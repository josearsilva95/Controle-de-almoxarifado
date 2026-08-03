import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { usePedidos } from '../hooks/usePedidos'
import { usePerfis } from '../hooks/usePerfis'
import { usePedidoSessoes } from '../hooks/usePedidoSessoes'
import { UrgenciaBadge } from '../components/UrgenciaBadge'
import { StatusBadge } from '../components/StatusBadge'
import { SessoesTimeline } from '../components/SessoesTimeline'
import { formatDataHora } from '../lib/tempo'

export function AdminDashboard() {
  const { profile, logout } = useAuth()
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
    <div className="app-shell">
      <header className="topbar">
        <h1>Controle de Movimentação — Painel Admin</h1>
        <div className="topbar-info">
          <span>{profile.nome_completo}</span>
          <button className="secundario" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <main className="conteudo">
        <div className="barra-acoes">
          <h2 style={{ margin: 0 }}>Pedidos</h2>
          <Link to="/admin/nova-pv">
            <button>+ Cadastrar PV</button>
          </Link>
        </div>

        {carregando && <p className="mensagem-vazio">Carregando pedidos...</p>}
        {!carregando && pedidos.length === 0 && (
          <p className="mensagem-vazio">Nenhuma PV cadastrada ainda.</p>
        )}

        {!carregando && pedidos.length > 0 && (
          <table className="tabela-pedidos">
            <thead>
              <tr>
                <th>PV</th>
                <th>Cliente</th>
                <th>Urgência</th>
                <th>Status</th>
                <th>Cadastrado em</th>
                <th>Iniciado em / por</th>
                <th>Finalizado em / por</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <Fragment key={pedido.id}>
                  <tr
                    onClick={() =>
                      setPedidoExpandido(pedidoExpandido === pedido.id ? null : pedido.id)
                    }
                  >
                    <td>{pedido.numero_pv}</td>
                    <td>{pedido.cliente}</td>
                    <td>
                      <UrgenciaBadge urgencia={pedido.urgencia} />
                    </td>
                    <td>
                      <StatusBadge pedido={pedido} />
                    </td>
                    <td>{formatDataHora(pedido.created_at)}</td>
                    <td>
                      {pedido.iniciado_em
                        ? `${formatDataHora(pedido.iniciado_em)} · ${nomeDe(pedido.iniciado_por)}`
                        : '—'}
                    </td>
                    <td>
                      {pedido.finalizado_em
                        ? `${formatDataHora(pedido.finalizado_em)} · ${nomeDe(pedido.finalizado_por)}`
                        : '—'}
                    </td>
                  </tr>
                  {pedidoExpandido === pedido.id && (
                    <tr className="linha-detalhes">
                      <td colSpan={7}>
                        <SessoesTimeline sessoes={sessoes} perfis={perfis} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  )
}
