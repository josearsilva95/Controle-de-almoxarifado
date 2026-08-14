import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Check } from 'lucide-react'
import { Botao } from './ui/Botao'
import { Cartao } from './ui/Cartao'
import { filtrarItensEstoque } from '../lib/buscaEstoque'
import { registrarContagem } from '../lib/acoesEstoque'
import { formatDataHora } from '../lib/tempo'
import type { EquipeEstoque, EstoqueContagem, EstoqueItem } from '../types/database'

interface InventarioContagemProps {
  itens: EstoqueItem[]
  contagens: EstoqueContagem[]
  equipe: EquipeEstoque
  usuarioId: string
  onContado: () => void
}

// Não mostra a quantidade do sistema durante a contagem, de propósito —
// contagem às cegas evita que quem conta só copie o número esperado em vez
// de contar de verdade.
export function InventarioContagem({ itens, contagens, equipe, usuarioId, onContado }: InventarioContagemProps) {
  const [busca, setBusca] = useState('')
  const [itemSelecionado, setItemSelecionado] = useState<EstoqueItem | null>(null)
  const [quantidade, setQuantidade] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const inputBuscaRef = useRef<HTMLInputElement>(null)
  const inputQuantidadeRef = useRef<HTMLInputElement>(null)

  const contagensDaEquipe = useMemo(() => contagens.filter((c) => c.equipe === equipe), [contagens, equipe])

  const resultados = useMemo(() => {
    if (!busca.trim() || itemSelecionado) return []
    return filtrarItensEstoque(itens, busca).slice(0, 8)
  }, [itens, busca, itemSelecionado])

  const contagensComItem = useMemo(() => {
    const itensPorId = new Map(itens.map((i) => [i.id, i]))
    return contagensDaEquipe
      .map((c) => ({ contagem: c, item: itensPorId.get(c.item_id) }))
      .filter((c): c is { contagem: EstoqueContagem; item: EstoqueItem } => Boolean(c.item))
      .sort((a, b) => new Date(b.contagem.contado_em).getTime() - new Date(a.contagem.contado_em).getTime())
  }, [contagensDaEquipe, itens])

  function selecionarItem(item: EstoqueItem) {
    setItemSelecionado(item)
    const existente = contagensDaEquipe.find((c) => c.item_id === item.id)
    setQuantidade(existente ? String(existente.quantidade) : '')
    setErro(null)
    setTimeout(() => inputQuantidadeRef.current?.focus(), 0)
  }

  function cancelarSelecao() {
    setItemSelecionado(null)
    setQuantidade('')
    setBusca('')
    setTimeout(() => inputBuscaRef.current?.focus(), 0)
  }

  async function confirmar(evento: FormEvent) {
    evento.preventDefault()
    if (!itemSelecionado) return
    const valor = Number(quantidade)
    if (!Number.isInteger(valor) || valor < 0) {
      setErro('Informe uma quantidade válida.')
      return
    }
    setSalvando(true)
    setErro(null)
    const { erro: erroAcao } = await registrarContagem(itemSelecionado.id, equipe, valor, usuarioId)
    setSalvando(false)
    if (erroAcao) {
      setErro(erroAcao)
      return
    }
    onContado()
    cancelarSelecao()
  }

  return (
    <div>
      <div className="mb-4 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
        Sua equipe já contou {contagensDaEquipe.length} de {itens.length} itens.
      </div>

      {!itemSelecionado ? (
        <div className="relative mb-6 sm:max-w-sm">
          <input
            ref={inputBuscaRef}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="text"
            placeholder="Buscar item pra contar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />
          {resultados.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-lg">
              {resultados.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                  onClick={() => selecionarItem(item)}
                >
                  <span className="font-medium text-card-foreground">{item.codigo}</span>{' '}
                  <span className="text-muted-foreground">{item.descricao}</span>
                </button>
              ))}
            </div>
          )}
          {busca.trim() && resultados.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">Nenhum item encontrado.</p>
          )}
        </div>
      ) : (
        <Cartao className="mb-6 sm:max-w-sm">
          <p className="text-xs text-muted-foreground">Contando</p>
          <p className="font-semibold text-card-foreground">{itemSelecionado.codigo}</p>
          <p className="mb-3 text-sm text-muted-foreground">{itemSelecionado.descricao}</p>
          <form onSubmit={confirmar}>
            <label className="mb-3 flex flex-col gap-1 text-sm font-medium text-card-foreground">
              Quantidade contada
              <input
                ref={inputQuantidadeRef}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                type="number"
                min={0}
                step={1}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                required
              />
            </label>
            {erro && <p className="mb-3 text-sm text-destructive">{erro}</p>}
            <div className="flex gap-2">
              <Botao type="button" variante="secundaria" onClick={cancelarSelecao}>
                Cancelar
              </Botao>
              <Botao type="submit" disabled={salvando}>
                <Check className="h-4 w-4" />
                {salvando ? 'Salvando...' : 'Confirmar e buscar próximo'}
              </Botao>
            </div>
          </form>
        </Cartao>
      )}

      <h3 className="mb-2 text-sm font-semibold text-card-foreground">Contagens da sua equipe</h3>
      {contagensComItem.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sua equipe ainda não contou nenhum item.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Código</th>
                <th className="px-3 py-2.5">Descrição</th>
                <th className="px-3 py-2.5">Quantidade</th>
                <th className="px-3 py-2.5">Quando</th>
              </tr>
            </thead>
            <tbody>
              {contagensComItem.map(({ contagem, item }) => (
                <tr key={contagem.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium text-card-foreground">{item.codigo}</td>
                  <td className="px-3 py-2.5 text-card-foreground">{item.descricao}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{contagem.quantidade}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{formatDataHora(contagem.contado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
