import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { Cartao } from '../components/ui/Cartao'
import { BarraProgresso } from '../components/ui/BarraProgresso'
import { EditarColaboradorModal } from '../components/EditarColaboradorModal'
import { usePedidosContext } from '../hooks/usePedidosContext'
import { usePerfis } from '../hooks/usePerfis'
import { useDesempenhoColaboradores } from '../hooks/useDesempenhoColaboradores'
import { formatDuracao } from '../lib/tempo'
import { rotuloDeposito } from '../lib/depositos'
import { rotuloRole } from '../lib/cores'
import type { Profile } from '../types/database'

export function AdminColaboradores() {
  const { pedidos, carregando: carregandoPedidos } = usePedidosContext()
  const perfis = usePerfis()
  const { desempenho: todoDesempenho, carregando: carregandoDesempenho } = useDesempenhoColaboradores(pedidos)
  const [colaboradorEditando, setColaboradorEditando] = useState<Profile | null>(null)
  const carregando = carregandoPedidos || carregandoDesempenho

  // Contas marcadas como ocultas (ex: usuário master) não aparecem nesta lista.
  const desempenho = todoDesempenho.filter((d) => !perfis[d.usuarioId]?.oculto)

  const maiorTotal = Math.max(
    1,
    ...desempenho.filter((d) => d.role === 'funcionario').map((d) => d.requisicoesFinalizadas)
  )

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
                    {rotuloRole(colaborador.role)}
                  </span>
                  {colaborador.role === 'funcionario' && (
                    <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {rotuloDeposito(perfis[colaborador.usuarioId]?.deposito ?? null)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {colaborador.role === 'funcionario' && (
                    <span className="text-sm text-muted-foreground">
                      {colaborador.requisicoesFinalizadas} requisições · {formatDuracao(colaborador.tempoTotalSegundos)}
                    </span>
                  )}
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-card-foreground"
                    onClick={() => {
                      const perfil = perfis[colaborador.usuarioId]
                      if (perfil) setColaboradorEditando(perfil)
                    }}
                    aria-label={`Editar ${colaborador.nome}`}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {colaborador.role === 'funcionario' && (
                <>
                  <BarraProgresso percent={(colaborador.requisicoesFinalizadas / maiorTotal) * 100} />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {colaborador.requisicoesFinalizadasMes} finalizada
                    {colaborador.requisicoesFinalizadasMes === 1 ? '' : 's'} este mês
                  </p>
                </>
              )}
            </Cartao>
          ))}
        </div>
      )}

      {colaboradorEditando && (
        <EditarColaboradorModal
          colaborador={colaboradorEditando}
          onFechar={() => setColaboradorEditando(null)}
          onSalvo={() => setColaboradorEditando(null)}
        />
      )}
    </AppShell>
  )
}
