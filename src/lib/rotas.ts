import type { Profile } from '../types/database'
import { podeAdministrar } from './permissoes'

export function rotaInicialPara(profile: Profile): string {
  if (podeAdministrar(profile)) return '/admin'
  if (profile.role === 'funcionario') return '/tarefas'
  // Líder sem lider_geral: hoje não existe tela própria para esse caso.
  return '/login'
}
