import { useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { usePedidos } from '../hooks/usePedidos'
import { usePerfis } from '../hooks/usePerfis'
import { PedidoCard } from '../components/PedidoCard'
import { assumirPedido, finalizarPedido, pausarPedido } from '../lib/acoesPedido'
import type { Pedido, Urgencia } from '../types/database'

const RANK_URGENCIA: Record<Urgencia, number> = { urgente: 0, medio: 1, nao_urgente: 2 }

export function FuncionarioTarefas() {
  const { profile, logout } = useAuth()
  const { pedidos, carregando } = usePedidos()
  const perfis = usePerfis()
  const [emProcessamento, setEmProcessamento] = useState<Set<string>>(new Set())
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)

  const pedidosVisiveis = useMemo(() => {
    return pedidos
      .filter((p) => p.status !== 'finalizado')
      .sort((a, b) => {
        const porUrgencia = RANK_URGENCIA[a.urgencia] - RANK_URGENCIA[b.urgencia]
        if (porUrgencia !== 0) return porUrgencia
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
  }, [pedidos])

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

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Controle de Movimentação — Minhas Tarefas</h1>
        <div className="topbar-info">
          <span>{profile.nome_completo}</span>
          <button className="secundario" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <main className="conteudo">
        {mensagemErro && <p className="mensagem-erro">{mensagemErro}</p>}

        {carregando && <p className="mensagem-vazio">Carregando tarefas...</p>}

        {!carregando && pedidosVisiveis.length === 0 && (
          <p className="mensagem-vazio">Nenhuma tarefa pendente no momento.</p>
        )}

        {!carregando && pedidosVisiveis.length > 0 && (
          <div className="grade-pedidos">
            {pedidosVisiveis.map((pedido) => (
              <PedidoCard
                key={pedido.id}
                pedido={pedido}
                perfis={perfis}
                usuarioAtualId={profile.id}
                processando={emProcessamento.has(pedido.id)}
                onIniciar={(p) => executarAcao(p, assumirPedido)}
                onContinuar={(p) => executarAcao(p, assumirPedido)}
                onPausar={(p) => executarAcao(p, pausarPedido)}
                onFinalizar={(p) => executarAcao(p, finalizarPedido)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
