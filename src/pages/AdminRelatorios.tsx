import { useMemo } from 'react'
import { CheckCircle2, Clock, ClipboardList, Calendar } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { Cartao } from '../components/ui/Cartao'
import { KpiCard } from '../components/ui/KpiCard'
import { GraficoBarrasHorizontais } from '../components/ui/GraficoBarrasHorizontais'
import { usePedidos } from '../hooks/usePedidos'
import { useDesempenhoColaboradores } from '../hooks/useDesempenhoColaboradores'
import { CORES, rotuloUrgencia } from '../lib/cores'
import { formatDuracao } from '../lib/tempo'
import type { Urgencia } from '../types/database'

const URGENCIAS: Urgencia[] = ['urgente', 'medio', 'nao_urgente']

// "Não urgente" usa branco/neutro nos badges (sobre fundo de cartão), mas como
// preenchimento de barra isso ficaria invisível — usa o tom de texto secundário
// do tema só neste contexto de gráfico, mantendo as outras cores idênticas ao badge.
const COR_BARRA_URGENCIA: Record<Urgencia, string> = {
  urgente: CORES.urgente,
  medio: CORES.medio,
  nao_urgente: 'var(--muted-foreground)',
}

function mesmoMes(iso: string, agora: Date): boolean {
  const data = new Date(iso)
  return data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth()
}

export function AdminRelatorios() {
  const { pedidos, carregando } = usePedidos()
  const { desempenho } = useDesempenhoColaboradores(pedidos)

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

    return {
      totalGeral: pedidos.length,
      totalMes: doMes.length,
      finalizadasMes: finalizadosMes.length,
      tempoMedioSegundos,
      porUrgencia,
    }
  }, [pedidos])

  const desempenhoMes = useMemo(
    () => [...desempenho].sort((a, b) => b.requisicoesFinalizadasMes - a.requisicoesFinalizadasMes),
    [desempenho]
  )

  const itensUrgencia = stats.porUrgencia.map((item) => ({
    rotulo: rotuloUrgencia(item.urgencia),
    valor: item.total,
    cor: COR_BARRA_URGENCIA[item.urgencia],
  }))

  const itensDesempenho = desempenhoMes.map((item) => ({
    rotulo: item.nome,
    valor: item.requisicoesFinalizadasMes,
    cor: 'var(--primary)',
  }))

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
        <KpiCard label="Total de requisições" valor={String(stats.totalGeral)} icone={ClipboardList} />
        <KpiCard label="Requisições no mês" valor={String(stats.totalMes)} icone={Calendar} />
        <KpiCard label="Finalizadas no mês" valor={String(stats.finalizadasMes)} icone={CheckCircle2} />
        <KpiCard label="Tempo médio de separação" valor={formatDuracao(stats.tempoMedioSegundos)} icone={Clock} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Cartao>
          <h3 className="text-base font-semibold text-card-foreground">Requisições por urgência</h3>
          <p className="text-sm text-muted-foreground">Distribuição atual de todas as requisições</p>
          <div className="mt-5">
            <GraficoBarrasHorizontais itens={itensUrgencia} />
          </div>
        </Cartao>

        <Cartao>
          <h3 className="text-base font-semibold text-card-foreground">Desempenho dos colaboradores</h3>
          <p className="text-sm text-muted-foreground">Requisições finalizadas no mês atual, por colaborador</p>
          <div className="mt-5">
            <GraficoBarrasHorizontais
              itens={itensDesempenho}
              vazio="Nenhum colaborador cadastrado ainda."
            />
          </div>
        </Cartao>
      </div>
    </AppShell>
  )
}
