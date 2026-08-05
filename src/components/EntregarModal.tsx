import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from './ui/Modal'
import type { Pedido } from '../types/database'

interface EntregarModalProps {
  pedido: Pedido
  onFechar: () => void
  onConfirmar: (nomeRetirou: string) => void
  processando: boolean
}

export function EntregarModal({ pedido, onFechar, onConfirmar, processando }: EntregarModalProps) {
  const [nome, setNome] = useState('')

  function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    onConfirmar(nome.trim())
  }

  return (
    <Modal titulo={`Entregar Requisição #${pedido.numero_pv}`} onFechar={onFechar}>
      <form onSubmit={handleSubmit}>
        <label className="mb-4 flex flex-col gap-1 text-sm font-medium text-card-foreground">
          Nome de quem retirou
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            autoFocus
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground hover:bg-muted"
            onClick={onFechar}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            disabled={processando}
          >
            {processando ? 'Salvando...' : 'Confirmar entrega'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
