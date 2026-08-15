import type { Profile } from '../types/database'
import { podeAdministrar } from './permissoes'

export function rotaInicialPara(profile: Profile): string {
  if (podeAdministrar(profile)) return '/admin'
  if (profile.role === 'funcionario') return '/tarefas'
  // Papel sem tela própria (ex: líder sem lider_geral), mas com equipe de
  // estoque atribuída — sem isso cairia num loop de volta pro /login.
  if (profile.equipe_estoque) return '/estoque'
  return '/login'
}
