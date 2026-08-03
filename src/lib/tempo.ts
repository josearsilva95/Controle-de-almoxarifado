import type { PedidoSessao } from '../types/database'

export function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuracao(segundosTotais: number): string {
  const segundos = Math.max(0, Math.round(segundosTotais))
  const horas = Math.floor(segundos / 3600)
  const minutos = Math.floor((segundos % 3600) / 60)
  if (horas === 0) return `${minutos}min`
  return `${horas}h ${minutos}min`
}

export function duracaoSessao(sessao: PedidoSessao, agoraMs: number): number {
  const inicioMs = new Date(sessao.inicio).getTime()
  if (sessao.fim) {
    return sessao.duracao_segundos ?? Math.round((new Date(sessao.fim).getTime() - inicioMs) / 1000)
  }
  return Math.round((agoraMs - inicioMs) / 1000)
}

export function tempoTotalPedido(sessoes: PedidoSessao[], agoraMs: number): number {
  return sessoes.reduce((total, sessao) => total + duracaoSessao(sessao, agoraMs), 0)
}

export interface TempoPorUsuario {
  usuarioId: string
  totalSegundos: number
  numSessoes: number
}

export function tempoPorUsuario(sessoes: PedidoSessao[], agoraMs: number): TempoPorUsuario[] {
  const mapa = new Map<string, TempoPorUsuario>()
  for (const sessao of sessoes) {
    const atual = mapa.get(sessao.usuario_id) ?? {
      usuarioId: sessao.usuario_id,
      totalSegundos: 0,
      numSessoes: 0,
    }
    atual.totalSegundos += duracaoSessao(sessao, agoraMs)
    atual.numSessoes += 1
    mapa.set(sessao.usuario_id, atual)
  }
  return [...mapa.values()]
}
