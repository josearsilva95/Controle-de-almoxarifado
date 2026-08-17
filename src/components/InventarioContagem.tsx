import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Lock, ScanBarcode } from 'lucide-react'
import { Botao } from './ui/Botao'
import { Modal } from './ui/Modal'
import { ScannerCodigoBarras } from './ScannerCodigoBarras'
import { filtrarItensEstoque } from '../lib/buscaEstoque'
import { finalizarContagemEquipe, registrarContagem } from '../lib/acoesEstoque'
import { lotesDoItem, itemTemMultiplosLotes } from '../lib/lotesItem'
import { formatDataHora } from '../lib/tempo'
import type { EquipeEstoque, EstoqueContagem, EstoqueEquipeStatus, EstoqueItem } from '../types/database'

interface InventarioContagemProps {
  itens: EstoqueItem[]
  contagens: EstoqueContagem[]
  equipe: EquipeEstoque
  usuarioId: string
  statusEquipe: EstoqueEquipeStatus | undefined
  onContado: () => void
  onStatusMudou: () => void
}

// Não mostra a quantidade do sistema durante a contagem, de propósito —
// contagem às cegas evita que quem conta só copie o número esperado em vez
// de contar de verdade.
export function InventarioContagem({
  itens,
  contagens,
  equipe,
  usuarioId,
  statusEquipe,
  onContado,
  onStatusMudou,
}: InventarioContagemProps) {
  const [busca, setBusca] = useState('')
  const [itemSelecionado, setItemSelecionado] = useState<EstoqueItem | null>(null)
  // null = item tem mais de um lote e ainda não escolheu qual está contando.
  const [loteSelecionado, setLoteSelecionado] = useState<string | null>(null)
  const [quantidade, setQuantidade] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mudandoStatus, setMudandoStatus] = useState(false)
  const [escaneando, setEscaneando] = useState(false)
  const [erroBusca, setErroBusca] = useState<string | null>(null)
  const inputBuscaRef = useRef<HTMLInputElement>(null)
  const inputQuantidadeRef = useRef<HTMLInputElement>(null)
  const finalizada = Boolean(statusEquipe?.finalizada_em)

  const contagensDaEquipe = useMemo(() => contagens.filter((c) => c.equipe === equipe), [contagens, equipe])

  const totalSlots = useMemo(
    () => itens.reduce((soma, item) => soma + lotesDoItem(item).length, 0),
    [itens]
  )

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

  const contagemDoSelecionado = useMemo(
    () =>
      itemSelecionado && loteSelecionado != null
        ? contagensDaEquipe.find((c) => c.item_id === itemSelecionado.id && c.lote === loteSelecionado)
        : undefined,
    [itemSelecionado, loteSelecionado, contagensDaEquipe]
  )

  function prepararLote(item: EstoqueItem, lote: string) {
    setLoteSelecionado(lote)
    setQuantidade('')
    setErro(null)
    const jaContado = contagensDaEquipe.some((c) => c.item_id === item.id && c.lote === lote)
    if (!jaContado) setTimeout(() => inputQuantidadeRef.current?.focus(), 0)
  }

  function selecionarItem(item: EstoqueItem) {
    setItemSelecionado(item)
    setErro(null)
    setQuantidade('')
    const lotes = lotesDoItem(item)
    if (lotes.length === 1) {
      prepararLote(item, lotes[0])
    } else {
      setLoteSelecionado(null)
    }
  }

  function voltarParaLotes() {
    setLoteSelecionado(null)
    setQuantidade('')
    setErro(null)
  }

  function handleCodigoLido(codigoLido: string) {
    setEscaneando(false)
    const item = itens.find((i) => i.codigo.toLowerCase() === codigoLido.toLowerCase())
    if (!item) {
      setErroBusca(`Nenhum item encontrado com o código "${codigoLido}".`)
      return
    }
    setErroBusca(null)
    selecionarItem(item)
  }

  function cancelarSelecao() {
    setItemSelecionado(null)
    setLoteSelecionado(null)
    setQuantidade('')
    setBusca('')
    setTimeout(() => inputBuscaRef.current?.focus(), 0)
  }

  async function confirmar(evento: FormEvent) {
    evento.preventDefault()
    if (!itemSelecionado || loteSelecionado == null) return
    const valor = Number(quantidade)
    if (!Number.isInteger(valor) || valor < 0) {
      setErro('Informe uma quantidade válida.')
      return
    }
    setSalvando(true)
    setErro(null)
    const { erro: erroAcao } = await registrarContagem(itemSelecionado.id, equipe, loteSelecionado, valor, usuarioId)
    setSalvando(false)
    if (erroAcao) {
      setErro(erroAcao)
      return
    }
    onContado()
    cancelarSelecao()
  }

  async function finalizar() {
    const confirmado = window.confirm(
      `Finalizar a contagem da sua equipe? Vocês contaram ${contagensDaEquipe.length} de ${totalSlots} itens. Dá pra reabrir depois se precisar.`
    )
    if (!confirmado) return
    setMudandoStatus(true)
    const { erro } = await finalizarContagemEquipe(equipe, usuarioId)
    setMudandoStatus(false)
    if (erro) {
      window.alert(`Não foi possível finalizar: ${erro}`)
      return
    }
    onStatusMudou()
  }

  const multiplosLotes = itemSelecionado ? itemTemMultiplosLotes(itemSelecionado) : false

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
        <span>
          Sua equipe já contou {contagensDaEquipe.length} de {totalSlots} itens.
          {finalizada && statusEquipe?.finalizada_em && ` Finalizada em ${formatDataHora(statusEquipe.finalizada_em)}.`}
        </span>
        {finalizada ? (
          <span className="text-xs text-muted-foreground">Só um admin pode reabrir a contagem.</span>
        ) : (
          <Botao variante="secundaria" tamanho="sm" onClick={finalizar} disabled={mudandoStatus}>
            Finalizar contagem
          </Botao>
        )}
      </div>

      <div className="mb-6 sm:max-w-sm">
        <div className="relative flex items-center gap-2">
          <input
            ref={inputBuscaRef}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="text"
            placeholder="Buscar item pra contar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
            onClick={() => {
              setErroBusca(null)
              setEscaneando(true)
            }}
          >
            <ScanBarcode className="h-4 w-4" />
            <span className="hidden sm:inline">Escanear</span>
          </button>
          {resultados.length > 0 && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-border bg-card shadow-lg">
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
        </div>
        {busca.trim() && resultados.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum item encontrado.</p>
        )}
        {erroBusca && <p className="mt-2 text-sm text-destructive">{erroBusca}</p>}
      </div>

      {itemSelecionado && (
        <Modal
          titulo={`Contando ${itemSelecionado.codigo}${loteSelecionado ? ` · lote ${loteSelecionado}` : ''}`}
          onFechar={cancelarSelecao}
        >
          {loteSelecionado == null ? (
            <>
              <p className="mb-3 text-sm text-muted-foreground">{itemSelecionado.descricao}</p>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Esse item tem mais de um lote — qual você está contando?
              </p>
              <div className="flex flex-col gap-2">
                {lotesDoItem(itemSelecionado).map((lote) => {
                  const jaContado = contagensDaEquipe.some((c) => c.item_id === itemSelecionado.id && c.lote === lote)
                  return (
                    <button
                      key={lote}
                      type="button"
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                      onClick={() => prepararLote(itemSelecionado, lote)}
                    >
                      <span className="font-medium text-card-foreground">{lote}</span>
                      {jaContado ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" /> já enviado
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">pendente</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          ) : contagemDoSelecionado ? (
            <>
              {multiplosLotes && (
                <button
                  type="button"
                  className="mb-3 text-xs text-primary hover:underline"
                  onClick={voltarParaLotes}
                >
                  ← Voltar aos lotes
                </button>
              )}
              <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Já enviado — não dá mais pra editar
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{itemSelecionado.descricao}</p>
              <p className="mb-4 text-sm text-card-foreground">
                Quantidade enviada: <span className="font-semibold">{contagemDoSelecionado.quantidade}</span>
                <br />
                <span className="text-xs text-muted-foreground">
                  em {formatDataHora(contagemDoSelecionado.contado_em)}
                </span>
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                Errou o número? Fala com um admin — só ele pode corrigir uma contagem já enviada.
              </p>
              <Botao type="button" variante="secundaria" onClick={cancelarSelecao}>
                Voltar à busca
              </Botao>
            </>
          ) : (
            <>
              {multiplosLotes && (
                <button
                  type="button"
                  className="mb-3 text-xs text-primary hover:underline"
                  onClick={voltarParaLotes}
                >
                  ← Voltar aos lotes
                </button>
              )}
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
                    autoFocus
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
            </>
          )}
        </Modal>
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
                <th className="px-3 py-2.5">Lote</th>
                <th className="px-3 py-2.5">Quantidade</th>
                <th className="px-3 py-2.5">Quando</th>
              </tr>
            </thead>
            <tbody>
              {contagensComItem.map(({ contagem, item }) => (
                <tr key={contagem.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium text-card-foreground">{item.codigo}</td>
                  <td className="px-3 py-2.5 text-card-foreground">{item.descricao}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{contagem.lote || '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{contagem.quantidade}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{formatDataHora(contagem.contado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {escaneando && <ScannerCodigoBarras onLido={handleCodigoLido} onFechar={() => setEscaneando(false)} />}
    </div>
  )
}
