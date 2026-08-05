import { Modal } from './ui/Modal'
import { formatDataHora, formatDuracao } from '../lib/tempo'
import { rotuloDeposito } from '../lib/depositos'
import { rotuloRole } from '../lib/cores'
import type { DesempenhoColaborador } from '../hooks/useDesempenhoColaboradores'
import type { Pedido, Profile } from '../types/database'

interface DetalheColaboradorModalProps {
  colaborador: DesempenhoColaborador
  perfil: Profile | undefined
  pedidos: Pedido[]
  onFechar: () => void
}

function Estatistica({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-md bg-secondary p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-secondary-foreground">{valor}</p>
    </div>
  )
}

export function DetalheColaboradorModal({ colaborador, perfil, pedidos, onFechar }: DetalheColaboradorModalProps) {
  const finalizadasRecentes = pedidos
    .filter((p) => p.finalizado_por === colaborador.usuarioId && p.status === 'finalizado')
    .sort((a, b) => new Date(b.finalizado_em!).getTime() - new Date(a.finalizado_em!).getTime())
    .slice(0, 8)

  return (
    <Modal titulo={colaborador.nome} onFechar={onFechar}>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {rotuloRole(colaborador.role)}
        </span>
        {perfil?.deposito && (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            {rotuloDeposito(perfil.deposito)}
          </span>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5">
        <Estatistica label="Requisições finalizadas" valor={String(colaborador.requisicoesFinalizadas)} />
        <Estatistica label="Finalizadas este mês" valor={String(colaborador.requisicoesFinalizadasMes)} />
        <Estatistica label="Tempo total trabalhado" valor={formatDuracao(colaborador.tempoTotalSegundos)} />
        <Estatistica
          label="Média por requisição"
          valor={formatDuracao(colaborador.tempoMedioPorRequisicaoSegundos)}
        />
        <Estatistica label="Tempo ocioso" valor={formatDuracao(colaborador.tempoOciosoSegundos)} />
      </div>

      <h3 className="mb-2 text-sm font-semibold text-card-foreground">Últimas requisições finalizadas</h3>
      {finalizadasRecentes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma requisição finalizada ainda.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {finalizadasRecentes.map((pedido) => (
            <li key={pedido.id} className="flex items-center justify-between gap-2 py-1.5">
              <div className="min-w-0">
                <span className="font-medium text-card-foreground">#{pedido.numero_pv}</span>{' '}
                <span className="truncate text-muted-foreground">{pedido.cliente}</span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDataHora(pedido.finalizado_em!)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground hover:bg-muted"
          onClick={onFechar}
        >
          Fechar
        </button>
      </div>
    </Modal>
  )
}
