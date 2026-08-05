import { AppShell } from '../components/AppShell'
import { Cartao } from '../components/ui/Cartao'
import { BarraProgresso } from '../components/ui/BarraProgresso'
import { usePedidosContext } from '../hooks/usePedidosContext'
import { usePerfis } from '../hooks/usePerfis'
import { useDesempenhoColaboradores } from '../hooks/useDesempenhoColaboradores'
import { formatDuracao } from '../lib/tempo'
import { rotuloDeposito } from '../lib/depositos'

export function LiderDesempenho() {
  const { pedidos, carregando: carregandoPedidos } = usePedidosContext()
  const perfis = usePerfis()
  const { desempenho: todoDesempenho, carregando: carregandoDesempenho } = useDesempenhoColaboradores(pedidos)
  const carregando = carregandoPedidos || carregandoDesempenho

  const desempenho = todoDesempenho.filter((d) => d.role === 'funcionario')
  const maiorTotal = Math.max(1, ...desempenho.map((d) => d.requisicoesFinalizadas))

  return (
    <AppShell>
      <h2 className="mb-1 text-lg font-semibold text-foreground">Desempenho da Equipe</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Visão geral de todos os funcionários, todos os depósitos.
      </p>

      {carregando && <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>}
      {!carregando && desempenho.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum funcionário cadastrado ainda.</p>
      )}

      {!carregando && desempenho.length > 0 && (
        <div className="space-y-3">
          {desempenho.map((colaborador) => (
            <Cartao key={colaborador.usuarioId}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-card-foreground">{colaborador.nome}</span>
                  <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    {rotuloDeposito(perfis[colaborador.usuarioId]?.deposito ?? null)}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {colaborador.requisicoesFinalizadas} requisições · {formatDuracao(colaborador.tempoTotalSegundos)}
                </span>
              </div>
              <BarraProgresso percent={(colaborador.requisicoesFinalizadas / maiorTotal) * 100} />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {colaborador.requisicoesFinalizadasMes} finalizada
                {colaborador.requisicoesFinalizadasMes === 1 ? '' : 's'} este mês · média de{' '}
                {formatDuracao(colaborador.tempoMedioPorRequisicaoSegundos)} por requisição · tempo ocioso:{' '}
                {formatDuracao(colaborador.tempoOciosoSegundos)}
              </p>
            </Cartao>
          ))}
        </div>
      )}
    </AppShell>
  )
}
