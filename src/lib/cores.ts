import type { Pedido, Role } from '../types/database'

export const CORES = {
  urgente: '#e53935',
  medio: '#fb8c00',
  nao_urgente: '#f5f5f5',
  pausado: '#1e88e5',
  finalizado: '#43a047',
} as const

/**
 * Precedência: pausado (azul) > finalizado (verde) > cor de urgência.
 */
export function corDoStatus(pedido: Pick<Pedido, 'status' | 'urgencia'>): string {
  if (pedido.status === 'pausado') return CORES.pausado
  if (pedido.status === 'finalizado') return CORES.finalizado
  return CORES[pedido.urgencia]
}

export function rotuloUrgencia(urgencia: Pedido['urgencia']): string {
  switch (urgencia) {
    case 'urgente':
      return 'Urgente'
    case 'medio':
      return 'Médio'
    case 'nao_urgente':
      return 'Não urgente'
  }
}

export function rotuloStatus(status: Pedido['status']): string {
  switch (status) {
    case 'pendente':
      return 'Pendente'
    case 'em_andamento':
      return 'Em andamento'
    case 'pausado':
      return 'Pausado'
    case 'finalizado':
      return 'Finalizado'
  }
}

export function rotuloRole(role: Role): string {
  if (role === 'admin') return 'Administrador'
  if (role === 'lider') return 'Líder'
  return 'Almoxarife'
}

export function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}
