import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from './ui/Modal'
import { Botao } from './ui/Botao'
import { classesBotaoSegmento } from './ui/BotaoSegmento'
import { supabase } from '../lib/supabaseClient'
import { DEPOSITOS, rotuloDeposito } from '../lib/depositos'
import type { Deposito, EstoqueItem } from '../types/database'

interface EstoqueItemModalProps {
  item: EstoqueItem | null
  categoriasExistentes: string[]
  onFechar: () => void
  onSalvo: () => void
}

export function EstoqueItemModal({ item, categoriasExistentes, onFechar, onSalvo }: EstoqueItemModalProps) {
  const [codigo, setCodigo] = useState(item?.codigo ?? '')
  const [descricao, setDescricao] = useState(item?.descricao ?? '')
  const [categoria, setCategoria] = useState(item?.categoria ?? '')
  const [deposito, setDeposito] = useState<Deposito>(item?.deposito ?? 'deposito_1')
  const [quantidade, setQuantidade] = useState(item?.quantidade != null ? String(item.quantidade) : '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)
    setSalvando(true)

    const corpo = {
      codigo: codigo.trim(),
      descricao: descricao.trim(),
      categoria: categoria.trim() || null,
      deposito,
      quantidade: quantidade.trim() ? Number(quantidade) : null,
    }

    const { error } = item
      ? await supabase.from('estoque_itens').update(corpo).eq('id', item.id)
      : await supabase.from('estoque_itens').insert(corpo)

    setSalvando(false)
    if (error) {
      setErro(
        error.code === '23505'
          ? 'Já existe um item com esse código nesse depósito.'
          : `Não foi possível salvar: ${error.message}`
      )
      return
    }
    onSalvo()
  }

  return (
    <Modal titulo={item ? `Editar ${item.codigo}` : 'Novo Item de Estoque'} onFechar={onFechar}>
      <form onSubmit={handleSubmit}>
        <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
          Código
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
          Descrição
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
          />
        </label>

        <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
          Categoria (opcional)
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="text"
            list="categorias-existentes"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Ex: Parafusos e Prisioneiros"
          />
          <datalist id="categorias-existentes">
            {categoriasExistentes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <label className="mb-4 flex flex-col gap-1 text-sm font-medium text-card-foreground">
          Quantidade (opcional)
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="number"
            min={0}
            step={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="Ainda não conferida"
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
