import { useEffect, useState } from 'react'
import { formatDataHora, formatDuracao, tempoPorUsuario, duracaoSessao } from '../lib/tempo'
import type { PedidoSessao, Profile } from '../types/database'

interface SessoesTimelineProps {
  sessoes: PedidoSessao[]
  perfis: Record<string, Profile>
}

export function SessoesTimeline({ sessoes, perfis }: SessoesTimelineProps) {
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const temSessaoAberta = sessoes.some((s) => !s.fim)
    if (!temSessaoAberta) return
    const intervalo = setInterval(() => setAgora(Date.now()), 30_000)
    return () => clearInterval(intervalo)
  }, [sessoes])

  if (sessoes.length === 0) {
    return <p className="mensagem-vazio">Nenhuma sessão de trabalho registrada ainda.</p>
  }

  const totais = tempoPorUsuario(sessoes, agora)

  return (
    <div>
      <ul className="timeline-sessoes">
        {sessoes.map((sessao) => {
          const nome = perfis[sessao.usuario_id]?.nome_completo ?? 'Desconhecido'
          const duracao = duracaoSessao(sessao, agora)
          return (
            <li key={sessao.id}>
              <strong>{nome}</strong> · {formatDataHora(sessao.inicio)} →{' '}
              {sessao.fim ? formatDataHora(sessao.fim) : 'em andamento'} · {formatDuracao(duracao)}
            </li>
          )
        })}
      </ul>

      <div className="totais-por-usuario">
        {totais.map((t) => (
          <span key={t.usuarioId} className="total-usuario-item">
            {perfis[t.usuarioId]?.nome_completo ?? 'Desconhecido'}: {formatDuracao(t.totalSegundos)} (
            {t.numSessoes} {t.numSessoes === 1 ? 'sessão' : 'sessões'})
          </span>
        ))}
      </div>
    </div>
  )
}
