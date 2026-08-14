import { Fragment, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { CheckCircle2, ClipboardList, Clock, Inbox, Pencil, PackageCheck, Trash2 } from 'lucide-react'
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
import { Cartao } from '../components/ui/Cartao'
import { KpiCard } from '../components/ui/KpiCard'
import { GraficoStatusEmpilhado } from '../components/ui/GraficoStatusEmpilhado'
import { GraficoBarrasHorizontais } from '../components/ui/GraficoBarrasHorizontais'
import { supabase } from '../lib/supabaseClient'
import { formatDataHora } from '../lib/tempo'
import { DEPOSITOS, COR_DEPOSITO, rotuloDeposito } from '../lib/depositos'
import { rotuloMotivoPausa } from '../lib/motivosPausa'
import { CORES } from '../lib/cores'
import type { Pedido, Status } from '../types/database'

const ABAS: { id: Status | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'em_andamento', label: 'Em Andamento' },
  { id: 'pausado', label: 'Pausadas' },
  { id: 'finalizado', label: 'Concluídas' },
]

function percentual(parte: number, total: number): string {
  if (total === 0) return '0% do total'
  return `${((parte / total) * 100).toFixed(1)}% do total`
}

export function AdminDashboard() {
  const { profile } = useAuth()
  const { pedidos, carregando } = usePedidosContext()
  const { perfis } = usePerfis()
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null)
  const [pedidoEditando, setPedidoEditando] = useState<Pedido | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<Status | 'todas'>('todas')
  const { sessoes } = usePedidoSessoes(pedidoExpandido)

  const stats = useMemo(() => {
    const total = pedidos.length
    const pendentes = pedidos.filter((p) => p.status === 'pendente').length
    const emAndamento = pedidos.filter((p) => p.status === 'em_andamento').length
    const pausadas = pedidos.filter((p) => p.status === 'pausado').length
    const finalizadas = pedidos.filter((p) => p.status === 'finalizado').length
    const aguardandoRetirada = pedidos.filter((p) => p.status === 'finalizado' && !p.entregue_em).length
    return { total, pendentes, emAndamento, pausadas, finalizadas, aguardandoRetirada }
  }, [pedidos])

  const contagemPorAba: Record<Status | 'todas', number> = {
    todas: stats.total,
    pendente: stats.pendentes,
    em_andamento: stats.emAndamento,
    pausado: stats.pausadas,
    finalizado: stats.finalizadas,
  }

  const pedidosFiltrados = abaAtiva === 'todas' ? pedidos : pedidos.filter((p) => p.status === abaAtiva)

  const itensStatus = [
    { rotulo: 'Pendente', valor: stats.pendentes, cor: CORES.pendente },
    { rotulo: 'Em andamento', valor: stats.emAndamento, cor: CORES.em_andamento },
    { rotulo: 'Pausado', valor: stats.pausadas, cor: CORES.pausado },
    { rotulo: 'Concluído', valor: stats.finalizadas, cor: CORES.finalizado },
  ]

  const itensDeposito = DEPOSITOS.map((deposito) => ({
    id: deposito,
    rotulo: rotuloDeposito(deposito),
    valor: pedidos.filter((p) => p.deposito === deposito).length,
    cor: COR_DEPOSITO[deposito],
  }))

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
      <h2 className="text-lg font-semibold text-foreground">Requisições</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Gerencie todas as requisições de materiais e acompanhe o status.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total de Requisições" valor={String(stats.total)} icone={ClipboardList} />
        <KpiCard
          label="Pendentes"
          valor={String(stats.pendentes)}
          icone={Inbox}
          cor={CORES.pendente}
          descricao={percentual(stats.pendentes, stats.total)}
        />
        <KpiCard
          label="Em Andamento"
          valor={String(stats.emAndamento)}
          icone={Clock}
          cor={CORES.em_andamento}
          descricao={percentual(stats.emAndamento, stats.total)}
        />
        <KpiCard
          label="Concluídas"
          valor={String(stats.finalizadas)}
          icone={CheckCircle2}
          cor={CORES.finalizado}
          descricao={percentual(stats.finalizadas, stats.total)}
        />
        <KpiCard
          label="Aguardando Retirada"
          valor={String(stats.aguardandoRetirada)}
          icone={PackageCheck}
          cor={CORES.aguardando_retirada}
          descricao={percentual(stats.aguardandoRetirada, stats.total)}
        />
      </div>

      <div className="mb-4 flex items-center gap-5 overflow-x-auto border-b border-border">
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            type="button"
            className={`flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 text-sm font-medium transition-colors ${
              abaAtiva === aba.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-card-foreground'
            }`}
            onClick={() => setAbaAtiva(aba.id)}
          >
            {aba.label}
            {aba.id !== 'todas' && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  abaAtiva === aba.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                {contagemPorAba[aba.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {carregando && <p className="py-8 text-center text-sm text-muted-foreground">Carregando requisições...</p>}
      {!carregando && pedidosFiltrados.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma requisição nesta aba.</p>
      )}

      {!carregando && pedidosFiltrados.length > 0 && (
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
              {pedidosFiltrados.map((pedido) => (
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

      {!carregando && pedidos.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Cartao>
            <h3 className="text-base font-semibold text-card-foreground">Requisições por Status</h3>
            <p className="text-sm text-muted-foreground">Distribuição de todas as requisições</p>
            <div className="mt-5">
              <GraficoStatusEmpilhado itens={itensStatus} />
            </div>
          </Cartao>
          <Cartao>
            <h3 className="text-base font-semibold text-card-foreground">Requisições por Depósito</h3>
            <p className="text-sm text-muted-foreground">Onde as requisições estão concentradas</p>
            <div className="mt-5">
              <GraficoBarrasHorizontais itens={itensDeposito} />
            </div>
          </Cartao>
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
