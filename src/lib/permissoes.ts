import type { Profile } from '../types/database'

// Admin sempre administra. Líder só administra (vê/mexe em tudo, como um segundo
// admin) se a conta tiver lider_geral=true — concedido manualmente por conta
// específica, não pelo papel em si (assim um líder novo não herda isso à toa).
export function podeAdministrar(profile: Profile | null | undefined): boolean {
  if (!profile) return false
  return profile.role === 'admin' || (profile.role === 'lider' && profile.lider_geral)
}
