import type { Profile } from '../types/database'

// Admin sempre administra. Líder só administra (vê/mexe em tudo, como um segundo
// admin) se a conta tiver lider_geral=true — concedido manualmente por conta
// específica, não pelo papel em si (assim um líder novo não herda isso à toa).
export function podeAdministrar(profile: Profile | null | undefined): boolean {
  if (!profile) return false
  return profile.role === 'admin' || (profile.role === 'lider' && profile.lider_geral)
}

// Acesso ao Estoque (catálogo + inventário): quem administra (vê tudo) ou
// quem foi colocado numa equipe de contagem pelo admin — não depende do
// papel (role). Um funcionário de equipe só enxerga a contagem, não o
// catálogo nem a atribuição de equipes; isso é decidido na própria tela.
export function podeAcessarEstoque(profile: Profile | null | undefined): boolean {
  if (!profile) return false
  return podeAdministrar(profile) || profile.equipe_estoque !== null
}
