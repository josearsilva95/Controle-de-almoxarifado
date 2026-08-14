import type { EquipeEstoque } from '../types/database'

export const EQUIPES: EquipeEstoque[] = ['equipe_1', 'equipe_2', 'equipe_3']

const ROTULOS: Record<EquipeEstoque, string> = {
  equipe_1: 'Equipe 1',
  equipe_2: 'Equipe 2',
  equipe_3: 'Equipe 3 (divergências)',
}

export function rotuloEquipe(equipe: EquipeEstoque | null): string {
  if (!equipe) return 'Nenhuma'
  return ROTULOS[equipe]
}
