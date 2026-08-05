import type { Role } from '../types/database'

export function rotaInicialPara(role: Role): string {
  if (role === 'admin') return '/admin'
  if (role === 'lider') return '/lider/desempenho'
  return '/tarefas'
}
