import { useMemo } from 'react'
import { AppShell } from '../components/AppShell'
import { Cartao } from '../components/ui/Cartao'
import { BarraProgresso } from '../components/ui/BarraProgresso'
import { KpiCard } from '../components/ui/KpiCard'
import { usePedidos } from '../hooks/usePedidos'
import { useDesempenhoColaboradores } from '../hooks/useDesempenhoColaboradores'
import { rotuloStatus, rotuloUrgencia } from '../lib/cores'
import { formatDuracao } from '../lib/tempo'
import type { Status, Urgencia } from '../types/database'

const URGENCIAS: Urgencia[] = ['urgente', 'medio', 'nao_urgente']
const STATUSES: Status[] = ['pendente', 'em_andamento', 'pausado', 'finalizado']

function mesmoMes(iso: string, agora: Date): boolean {
  const data = new Date(iso)
  return data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth()
}

export function AdminRelatorios() {
  const { pedidos, carregando } = usePedidos()
  const { desempenho } = useDesempenhoColaboradores()

  const stats = useMemo(() => {
    const agora = new Date()
    const doMes = pedidos.filter((p) => mesmoMes(p.created_at, agora))
    const finalizados = pedidos.filter((p) => p.status === 'finalizado')
    const finalizadosMes = finalizados.filter((p) => p.finalizado_em && mesmoMes(p.finalizado_em, agora))

    const duracoes = finalizados
      .filter((p) => p.iniciado_em && p.finalizado_em)
      .map((p) => (new Date(p.finalizado_em!).getTime() - new Date(p.iniciado_em!).getTime()) / 1000)
    const tempoMedioSegundos = duracoes.length
      ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length
      : 0

    const porUrgencia = URGENCIAS.map((urgencia) => ({
      urgencia,
      total: pedidos.filter((p) => p.urgencia === urgencia).length,
    }))
    const porStatus = STATUSES.map((status) => ({
      status,
      total: pedidos.filter((p) => p.status === status).length,
    }))

    return {
      totalGeral: pedidos.length,
      totalMes: doMes.length,
      finalizadasMes: finalizadosMes.length,
      tempoMedioSegundos,
      porUrgencia,
      porStatus,
    }
  }, [pedidos])

  const rankingMes = useMemo(
    () => [...desempenho].sort((a, b) => b.requisicoesFinalizadasMes - a.requisicoesFinalizadasMes),
    [desempenho]
  )
  const maiorUrgencia = Math.max(1, ...stats.porUrgencia.map((u) => u.total))
  const maiorStatus = Math.max(1, ...stats.porStatus.map((s) => s.total))
  const maiorRankingMes = Math.max(1, ...rankingMes.map((r) => r.requisicoesFinalizadasMes))

  if (carregando) {
    return (
      <AppShell>
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando relatórios...</p>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Relatórios</h2>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total de requisições" valor={String(stats.totalGeral)} />
        <KpiCard label="Requisições no mês" valor={String(stats.totalMes)} />
        <KpiCard label="Finalizadas no mês" valor={String(stats.finalizadasMes)} />
        <KpiCard label="Tempo médio de separação" valor={formatDuracao(stats.tempoMedioSegundos)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Cartao>
          <h3 className="text-base font-semibold text-card-foreground">Requisições por urgência</h3>
          <p className="text-sm text-muted-foreground">Distribuição atual de todas as requisições</p>
          <div className="mt-5 space-y-4">
            {stats.porUrgencia.map((item) => (
              <div key={item.urgencia}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-card-foreground">{rotuloUrgencia(item.urgencia)}</span>
                  <span className="text-muted-foreground">{item.total}</span>
                </div>
                <BarraProgresso percent={(item.total / maiorUrgencia) * 100} />
              </div>
            ))}
          </div>
        </Cartao>

        <Cartao>
          <h3 className="text-base font-semibold text-card-foreground">Requisições por status</h3>
          <p className="text-sm text-muted-foreground">Situação atual de todas as requisições</p>
          <div className="mt-5 space-y-4">
            {stats.porStatus.map((item) => (
              <div key={item.status}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-card-foreground">{rotuloStatus(item.status)}</span>
                  <span className="text-muted-foreground">{item.total}</span>
                </div>
                <BarraProgresso percent={(item.total / maiorStatus) * 100} />
              </div>
            ))}
          </div>
        </Cartao>

        <Cartao className="lg:col-span-2">
          <h3 className="text-base font-semibold text-card-foreground">Ranking de colaboradores do mês</h3>
          <p className="text-sm text-muted-foreground">Requisições finalizadas no mês atual, por colaborador</p>
          <div className="mt-5 space-y-4">
            {rankingMes.map((item) => (
              <div key={item.usuarioId}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-card-foreground">{item.nome}</span>
                  <span className="text-muted-foreground">{item.requisicoesFinalizadasMes}</span>
                </div>
                <BarraProgresso percent={(item.requisicoesFinalizadasMes / maiorRankingMes) * 100} />
              </div>
            ))}
            {rankingMes.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado ainda.</p>
            )}
          </div>
        </Cartao>
      </div>
    </AppShell>
  )
}
