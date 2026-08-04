import { useEffect, useState } from 'react'
import { formatDataHora, formatDuracao, tempoPorUsuario, duracaoSessao } from '../lib/tempo'
import { rotuloMotivoPausa } from '../lib/motivosPausa'
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
    return <p className="py-4 text-sm text-muted-foreground">Nenhuma sessão de trabalho registrada ainda.</p>
  }

  const totais = tempoPorUsuario(sessoes, agora)

  return (
    <div>
      <ul className="divide-y divide-dashed divide-border text-sm">
        {sessoes.map((sessao) => {
          const nome = perfis[sessao.usuario_id]?.nome_completo ?? 'Desconhecido'
          const duracao = duracaoSessao(sessao, agora)
          return (
            <li key={sessao.id} className="py-1.5 text-card-foreground">
              <strong>{nome}</strong> · {formatDataHora(sessao.inicio)} →{' '}
              {sessao.fim ? formatDataHora(sessao.fim) : 'em andamento'} · {formatDuracao(duracao)}
              {sessao.motivo_pausa && ` · Pausada por: ${rotuloMotivoPausa(sessao.motivo_pausa)}`}
            </li>
          )
        })}
      </ul>

      <div className="mt-2.5 flex flex-wrap gap-2.5 text-sm">
        {totais.map((t) => (
          <span key={t.usuarioId} className="rounded-md bg-secondary px-3 py-1.5 text-secondary-foreground">
            {perfis[t.usuarioId]?.nome_completo ?? 'Desconhecido'}: {formatDuracao(t.totalSegundos)} (
            {t.numSessoes} {t.numSessoes === 1 ? 'sessão' : 'sessões'})
          </span>
        ))}
      </div>
    </div>
  )
}
