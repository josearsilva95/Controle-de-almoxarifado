import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { rotaInicialPara } from '../lib/rotas'
import { podeAcessarEstoque } from '../lib/permissoes'

// Protege /estoque — libera pra quem administra (catálogo + equipes +
// inventário completo) ou pra quem foi colocado numa equipe de contagem
// (ver [[podeAcessarEstoque]]); a própria tela decide o que cada um vê.
export function RotaEstoque({ children }: { children: ReactNode }) {
  const { session, profile, carregando } = useAuth()

  if (carregando) return null
  if (!session || !profile) return <Navigate to="/login" replace />
  if (!podeAcessarEstoque(profile)) {
    return <Navigate to={rotaInicialPara(profile)} replace />
  }
  return <>{children}</>
}
