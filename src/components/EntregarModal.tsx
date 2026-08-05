import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from './ui/Modal'
import { Botao } from './ui/Botao'
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
          <Botao type="button" variante="secundaria" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={processando}>
            {processando ? 'Salvando...' : 'Confirmar entrega'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}
