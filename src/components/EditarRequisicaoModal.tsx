import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from './ui/Modal'
import { supabase } from '../lib/supabaseClient'
import { CORES, rotuloUrgencia } from '../lib/cores'
import type { Pedido, Urgencia } from '../types/database'

const OPCOES_URGENCIA: Urgencia[] = ['urgente', 'medio', 'nao_urgente']

interface EditarRequisicaoModalProps {
  pedido: Pedido
  onFechar: () => void
  onSalvo: () => void
}

export function EditarRequisicaoModal({ pedido, onFechar, onSalvo }: EditarRequisicaoModalProps) {
  const [numeroPv, setNumeroPv] = useState(pedido.numero_pv)
  const [cliente, setCliente] = useState(pedido.cliente)
  const [urgencia, setUrgencia] = useState<Urgencia>(pedido.urgencia)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)
    setSalvando(true)

    const { error } = await supabase
      .from('pedidos')
      .update({ numero_pv: numeroPv.trim(), cliente: cliente.trim(), urgencia })
      .eq('id', pedido.id)

    setSalvando(false)
    if (error) {
      setErro(`Não foi possível salvar: ${error.message}`)
      return
    }
    onSalvo()
  }

  return (
    <Modal titulo={`Editar Requisição #${pedido.numero_pv}`} onFechar={onFechar}>
      <form onSubmit={handleSubmit}>
        <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
          Número da requisição
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="text"
            value={numeroPv}
            onChange={(e) => setNumeroPv(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
          Cliente
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="text"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            required
          />
        </label>

        <div className="mb-4">
          <span className="mb-1 block text-sm font-medium text-card-foreground">Urgência</span>
          <div className="flex gap-2">
            {OPCOES_URGENCIA.map((opcao) => (
              <button
                key={opcao}
                type="button"
                className={`flex-1 rounded-md border-2 px-2 py-2.5 text-center text-xs font-semibold text-foreground transition-colors ${
                  urgencia === opcao ? 'border-primary ring-2 ring-ring/30' : 'border-border'
                }`}
                style={{ background: opcao === 'nao_urgente' ? CORES.nao_urgente : `${CORES[opcao]}22` }}
                onClick={() => setUrgencia(opcao)}
              >
                {rotuloUrgencia(opcao)}
              </button>
            ))}
          </div>
        </div>

        {erro && <p className="mb-3.5 text-sm text-destructive">{erro}</p>}

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
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
