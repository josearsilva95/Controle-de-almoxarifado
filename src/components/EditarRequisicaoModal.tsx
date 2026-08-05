import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from './ui/Modal'
import { Botao } from './ui/Botao'
import { classesBotaoSegmento, classesBotaoSegmentoCor } from './ui/BotaoSegmento'
import { supabase } from '../lib/supabaseClient'
import { CORES, rotuloUrgencia } from '../lib/cores'
import { DEPOSITOS, rotuloDeposito } from '../lib/depositos'
import type { Deposito, Pedido, Urgencia } from '../types/database'

const OPCOES_URGENCIA: Urgencia[] = ['urgente', 'medio', 'nao_urgente']

interface EditarRequisicaoModalProps {
  pedido: Pedido
  onFechar: () => void
  onSalvo: () => void
}

export function EditarRequisicaoModal({ pedido, onFechar, onSalvo }: EditarRequisicaoModalProps) {
  const [numeroPv, setNumeroPv] = useState(pedido.numero_pv)
  const [cliente, setCliente] = useState(pedido.cliente)
  const [quantidadeItens, setQuantidadeItens] = useState(String(pedido.quantidade_itens))
  const [urgencia, setUrgencia] = useState<Urgencia>(pedido.urgencia)
  const [deposito, setDeposito] = useState<Deposito>(pedido.deposito)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)

    const quantidade = Number(quantidadeItens)
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      setErro('Informe uma quantidade de itens válida.')
      return
    }

    setSalvando(true)

    const { error } = await supabase
      .from('pedidos')
      .update({
        numero_pv: numeroPv.trim(),
        cliente: cliente.trim(),
        quantidade_itens: quantidade,
        urgencia,
        deposito,
      })
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
          Número da PV
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

        <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
          Quantidade de itens
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="number"
            min={1}
            step={1}
            value={quantidadeItens}
            onChange={(e) => setQuantidadeItens(e.target.value)}
            required
          />
        </label>

        <div className="mb-4">
          <span className="mb-1 block text-sm font-medium text-card-foreground">Depósito</span>
          <div className="flex gap-2">
            {DEPOSITOS.map((opcao) => (
              <button
                key={opcao}
                type="button"
                className={classesBotaoSegmento(deposito === opcao, 'compacto')}
                onClick={() => setDeposito(opcao)}
              >
                {rotuloDeposito(opcao)}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <span className="mb-1 block text-sm font-medium text-card-foreground">Urgência</span>
          <div className="flex gap-2">
            {OPCOES_URGENCIA.map((opcao) => (
              <button
                key={opcao}
                type="button"
                className={classesBotaoSegmentoCor(urgencia === opcao)}
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
          <Botao type="button" variante="secundaria" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}
