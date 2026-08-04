import { Modal } from './ui/Modal'
import { MOTIVOS_PAUSA, rotuloMotivoPausa } from '../lib/motivosPausa'
import type { MotivoPausa, Pedido } from '../types/database'

interface PausarModalProps {
  pedido: Pedido
  onFechar: () => void
  onEscolher: (motivo: MotivoPausa) => void
  processando: boolean
}

export function PausarModal({ pedido, onFechar, onEscolher, processando }: PausarModalProps) {
  return (
    <Modal titulo={`Pausar Requisição #${pedido.numero_pv}`} onFechar={onFechar}>
      <p className="mb-4 text-sm text-muted-foreground">Selecione o motivo da pausa:</p>
      <div className="flex flex-col gap-2">
        {MOTIVOS_PAUSA.map((motivo) => (
          <button
            key={motivo}
            type="button"
            className="rounded-md border border-border bg-card px-4 py-2.5 text-left text-sm font-medium text-card-foreground transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
            onClick={() => onEscolher(motivo)}
            disabled={processando}
          >
            {rotuloMotivoPausa(motivo)}
          </button>
        ))}
      </div>
    </Modal>
  )
}
