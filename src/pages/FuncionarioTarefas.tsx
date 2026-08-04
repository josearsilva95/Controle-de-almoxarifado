import { useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { usePedidosContext } from '../hooks/usePedidosContext'
import { usePerfis } from '../hooks/usePerfis'
import { PedidoCard } from '../components/PedidoCard'
import { AppShell } from '../components/AppShell'
import { PausarModal } from '../components/PausarModal'
import { assumirPedido, finalizarPedido, pausarPedido } from '../lib/acoesPedido'
import type { MotivoPausa, Pedido, Urgencia } from '../types/database'

const RANK_URGENCIA: Record<Urgencia, number> = { urgente: 0, medio: 1, nao_urgente: 2 }

export function FuncionarioTarefas() {
  const { profile } = useAuth()
  const { pedidos, carregando } = usePedidosContext()
  const perfis = usePerfis()
  const [emProcessamento, setEmProcessamento] = useState<Set<string>>(new Set())
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)
  const [pedidoPausando, setPedidoPausando] = useState<Pedido | null>(null)
  const [modoSelecao, setModoSelecao] = useState(false)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  const pedidosVisiveis = useMemo(() => {
    return pedidos
      .filter((p) => p.status !== 'finalizado')
      .sort((a, b) => {
        const porUrgencia = RANK_URGENCIA[a.urgencia] - RANK_URGENCIA[b.urgencia]
        if (porUrgencia !== 0) return porUrgencia
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
  }, [pedidos])

  const pendentesDisponiveis = useMemo(
    () => pedidosVisiveis.filter((p) => p.status === 'pendente'),
    [pedidosVisiveis]
  )

  if (!profile) return null

  async function executarAcao(pedido: Pedido, acao: (pedido: Pedido, usuarioId: string) => Promise<{ erro: string | null }>) {
    setMensagemErro(null)
    setEmProcessamento((atual) => new Set(atual).add(pedido.id))
    const { erro } = await acao(pedido, profile!.id)
    setEmProcessamento((atual) => {
      const novo = new Set(atual)
      novo.delete(pedido.id)
      return novo
    })
    if (erro) setMensagemErro(erro)
  }

  async function confirmarPausa(motivo: MotivoPausa) {
    if (!pedidoPausando) return
    const pedido = pedidoPausando
    await executarAcao(pedido, (p, usuarioId) => pausarPedido(p, usuarioId, motivo))
    setPedidoPausando(null)
  }

  function toggleSelecao(pedido: Pedido) {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(pedido.id)) {
        novo.delete(pedido.id)
      } else {
        novo.add(pedido.id)
      }
      return novo
    })
  }

  function cancelarSelecao() {
    setModoSelecao(false)
    setSelecionados(new Set())
  }

  async function iniciarSelecionadas() {
    const idsSelecionados = [...selecionados]
    if (idsSelecionados.length === 0) return

    setMensagemErro(null)
    setEmProcessamento((atual) => {
      const novo = new Set(atual)
      idsSelecionados.forEach((id) => novo.add(id))
      return novo
    })

    const resultados = await Promise.all(
      idsSelecionados.map(async (id) => {
        const pedido = pedidos.find((p) => p.id === id)
        if (!pedido) return { id, erro: 'Requisição não encontrada.' }
        const { erro } = await assumirPedido(pedido, profile!.id)
        return { id, erro }
      })
    )

    setEmProcessamento((atual) => {
      const novo = new Set(atual)
      idsSelecionados.forEach((id) => novo.delete(id))
      return novo
    })

    const falhas = resultados.filter((r) => r.erro)
    if (falhas.length > 0) {
      setMensagemErro(
        `${falhas.length} de ${idsSelecionados.length} requisições não puderam ser iniciadas (talvez já tenham sido assumidas por outro funcionário).`
      )
    }

    cancelarSelecao()
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Minhas Requisições</h2>
        {!modoSelecao ? (
          <button
            type="button"
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-card-foreground transition-colors hover:bg-muted disabled:opacity-50"
            onClick={() => setModoSelecao(true)}
            disabled={pendentesDisponiveis.length === 0}
          >
            Selecionar várias
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selecionados.size} selecionada(s)</span>
            <button
              type="button"
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-card-foreground hover:bg-muted"
              onClick={cancelarSelecao}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
              onClick={iniciarSelecionadas}
              disabled={selecionados.size === 0}
            >
              Iniciar {selecionados.size > 0 ? selecionados.size : ''} requisiç{selecionados.size === 1 ? 'ão' : 'ões'}
            </button>
          </div>
        )}
      </div>

      {modoSelecao && (
        <p className="mb-4 text-sm text-muted-foreground">
          Clique nas requisições pendentes que você vai separar agora e depois em "Iniciar" — todas passam a
          correr o tempo ao mesmo tempo.
        </p>
      )}

      {mensagemErro && <p className="mb-4 text-sm text-destructive">{mensagemErro}</p>}

      {carregando && <p className="py-8 text-center text-sm text-muted-foreground">Carregando requisições...</p>}

      {!carregando && pedidosVisiveis.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma requisição pendente no momento.
        </p>
      )}

      {!carregando && pedidosVisiveis.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pedidosVisiveis.map((pedido) => (
            <PedidoCard
              key={pedido.id}
              pedido={pedido}
              perfis={perfis}
              usuarioAtualId={profile.id}
              processando={emProcessamento.has(pedido.id)}
              onIniciar={(p) => executarAcao(p, assumirPedido)}
              onContinuar={(p) => executarAcao(p, assumirPedido)}
              onPausar={(p) => setPedidoPausando(p)}
              onFinalizar={(p) => executarAcao(p, finalizarPedido)}
              modoSelecao={modoSelecao}
              selecionado={selecionados.has(pedido.id)}
              onToggleSelecao={toggleSelecao}
            />
          ))}
        </div>
      )}

      {pedidoPausando && (
        <PausarModal
          pedido={pedidoPausando}
          onFechar={() => setPedidoPausando(null)}
          onEscolher={confirmarPausa}
          processando={emProcessamento.has(pedidoPausando.id)}
        />
      )}
    </AppShell>
  )
}
