import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, ClipboardList, Calendar, AlertTriangle, Download } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { Cartao } from '../components/ui/Cartao'
import { KpiCard } from '../components/ui/KpiCard'
import { GraficoBarrasHorizontais } from '../components/ui/GraficoBarrasHorizontais'
import { DetalheColaboradorModal } from '../components/DetalheColaboradorModal'
import { usePedidosContext } from '../hooks/usePedidosContext'
import { usePerfis } from '../hooks/usePerfis'
import { useDesempenhoColaboradores } from '../hooks/useDesempenhoColaboradores'
import type { DesempenhoColaborador } from '../hooks/useDesempenhoColaboradores'
import { CORES, rotuloUrgencia } from '../lib/cores'
import { formatDataHora, formatDuracao } from '../lib/tempo'
import { gerarRelatorioMensalPdf } from '../lib/relatorioPdf'
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

function mesmoDia(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export function AdminRelatorios() {
  const { pedidos, carregando } = usePedidosContext()
  const perfis = usePerfis()
  const { desempenho } = useDesempenhoColaboradores(pedidos)
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<DesempenhoColaborador | null>(null)

  const stats = useMemo(() => {
    const agora = new Date()
    const doMes = pedidos.filter((p) => mesmoMes(p.created_at, agora))
    const finalizados = pedidos.filter((p) => p.status === 'finalizado')
    const finalizadosMes = finalizados.filter((p) => p.finalizado_em && mesmoMes(p.finalizado_em, agora))
    const entreguesMes = pedidos.filter((p) => p.entregue_em && mesmoMes(p.entregue_em, agora))

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
    const porUrgenciaMes = URGENCIAS.map((urgencia) => ({
      urgencia,
      total: doMes.filter((p) => p.urgencia === urgencia).length,
    }))

    return {
      totalGeral: pedidos.length,
      totalMes: doMes.length,
      finalizadasMes: finalizadosMes.length,
      entreguesMes: entreguesMes.length,
      tempoMedioSegundos,
      porUrgencia,
      porUrgenciaMes,
    }
  }, [pedidos])

  const desempenhoMes = useMemo(
    () =>
      desempenho
        .filter((d) => d.role === 'funcionario') // admins não executam separação, não entram nas estatísticas
        .sort((a, b) => b.requisicoesFinalizadasMes - a.requisicoesFinalizadasMes),
    [desempenho]
  )

  // Urgente + almoxarifado separou no mesmo dia (cumpriu o prazo) + cliente não
  // retirou no mesmo dia (ou ainda nem retirou) — atraso é do lado de quem busca,
  // não da separação, mas vale marcar quanto tempo ficou esperando.
  const urgentesNaoRetiradas = useMemo(() => {
    const agora = Date.now()
    return pedidos
      .filter((p) => {
        if (p.urgencia !== 'urgente' || !p.finalizado_em) return false
        if (!mesmoDia(p.created_at, p.finalizado_em)) return false
        if (!p.entregue_em) return true
        return !mesmoDia(p.finalizado_em, p.entregue_em)
      })
      .map((p) => ({
        pedido: p,
        segundosEsperando:
          ((p.entregue_em ? new Date(p.entregue_em).getTime() : agora) - new Date(p.finalizado_em!).getTime()) /
          1000,
      }))
      .sort((a, b) => b.segundosEsperando - a.segundosEsperando)
  }, [pedidos])

  const itensUrgencia = stats.porUrgencia.map((item) => ({
    rotulo: rotuloUrgencia(item.urgencia),
    valor: item.total,
    cor: COR_BARRA_URGENCIA[item.urgencia],
  }))

  const itensDesempenho = desempenhoMes.map((item) => ({
    id: item.usuarioId,
    rotulo: item.nome,
    valor: item.requisicoesFinalizadasMes,
    cor: 'var(--primary)',
  }))

  function abrirDetalheColaborador(usuarioId: string) {
    const colaborador = desempenhoMes.find((d) => d.usuarioId === usuarioId)
    if (colaborador) setColaboradorSelecionado(colaborador)
  }

  function baixarPdfDoMes() {
    const totalTempoTrabalhado = desempenhoMes.reduce((soma, c) => soma + c.tempoTotalSegundos, 0)
    const totalFinalizadasEquipe = desempenhoMes.reduce((soma, c) => soma + c.requisicoesFinalizadas, 0)
    const tempoMedioPorRequisicaoSegundos = totalFinalizadasEquipe
      ? totalTempoTrabalhado / totalFinalizadasEquipe
      : 0

    const porUrgenciaMap = Object.fromEntries(stats.porUrgenciaMes.map((u) => [u.urgencia, u.total]))

    gerarRelatorioMensalPdf({
      mesReferencia: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      totalRequisicoes: stats.totalMes,
      urgentes: porUrgenciaMap.urgente ?? 0,
      medias: porUrgenciaMap.medio ?? 0,
      naoUrgentes: porUrgenciaMap.nao_urgente ?? 0,
      finalizadas: stats.finalizadasMes,
      entregues: stats.entreguesMes,
      tempoMedioSeparacaoSegundos: stats.tempoMedioSegundos,
      tempoMedioPorRequisicaoSegundos,
      colaboradores: desempenhoMes.map((c) => ({
        nome: c.nome,
        finalizadas: c.requisicoesFinalizadasMes,
        tempoTotalSegundos: c.tempoTotalSegundos,
      })),
    })
  }

  if (carregando) {
    return (
      <AppShell>
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando relatórios...</p>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Relatórios</h2>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          onClick={baixarPdfDoMes}
        >
          <Download className="h-4 w-4" />
          Baixar PDF do mês
        </button>
      </div>

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
              aoClicarItem={abrirDetalheColaborador}
            />
          </div>
        </Cartao>
      </div>

      <Cartao className="mt-4">
        <div className="mb-1 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="text-base font-semibold text-card-foreground">
            Urgentes separadas mas não retiradas no mesmo dia
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          O almoxarifado separou no mesmo dia da requisição — o atraso aqui é da retirada, não da separação.
        </p>
        {urgentesNaoRetiradas.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Nenhum caso no momento.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border text-sm">
            {urgentesNaoRetiradas.map(({ pedido, segundosEsperando }) => (
              <li key={pedido.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <span className="font-medium text-card-foreground">#{pedido.numero_pv}</span>{' '}
                  <span className="text-muted-foreground">{pedido.cliente}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    separada em {formatDataHora(pedido.finalizado_em!)}
                  </span>
                </div>
                <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                  {pedido.entregue_em ? `demorou ${formatDuracao(segundosEsperando)} para retirar` : `esperando há ${formatDuracao(segundosEsperando)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      {colaboradorSelecionado && (
        <DetalheColaboradorModal
          colaborador={colaboradorSelecionado}
          perfil={perfis[colaboradorSelecionado.usuarioId]}
          pedidos={pedidos}
          onFechar={() => setColaboradorSelecionado(null)}
        />
      )}
    </AppShell>
  )
}
