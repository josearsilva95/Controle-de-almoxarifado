import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Cartao } from '../components/ui/Cartao'
import { BarraProgresso } from '../components/ui/BarraProgresso'
import { usePedidos } from '../hooks/usePedidos'
import { useDesempenhoColaboradores } from '../hooks/useDesempenhoColaboradores'
import { formatDuracao } from '../lib/tempo'

export function AdminColaboradores() {
  const { pedidos, carregando: carregandoPedidos } = usePedidos()
  const { desempenho, carregando: carregandoDesempenho } = useDesempenhoColaboradores(pedidos)
  const carregando = carregandoPedidos || carregandoDesempenho
  const maiorTotal = Math.max(1, ...desempenho.map((d) => d.requisicoesFinalizadas))

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Colaboradores</h2>
        <Link
          to="/admin/novo-colaborador"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          + Novo Colaborador
        </Link>
      </div>

      {carregando && <p className="py-8 text-center text-sm text-muted-foreground">Carregando colaboradores...</p>}
      {!carregando && desempenho.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum colaborador cadastrado ainda.</p>
      )}

      {!carregando && desempenho.length > 0 && (
        <div className="space-y-3">
          {desempenho.map((colaborador) => (
            <Cartao key={colaborador.usuarioId}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-card-foreground">{colaborador.nome}</span>
                  <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    {colaborador.role === 'admin' ? 'Admin' : 'Funcionário'}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {colaborador.requisicoesFinalizadas} requisições · {formatDuracao(colaborador.tempoTotalSegundos)}
                </span>
              </div>
              <BarraProgresso percent={(colaborador.requisicoesFinalizadas / maiorTotal) * 100} />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {colaborador.requisicoesFinalizadasMes} finalizada
                {colaborador.requisicoesFinalizadasMes === 1 ? '' : 's'} este mês
              </p>
            </Cartao>
          ))}
        </div>
      )}
    </AppShell>
  )
}
