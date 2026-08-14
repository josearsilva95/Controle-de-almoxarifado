import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { rotaInicialPara } from '../lib/rotas'
import { podeAcessarInventario } from '../lib/permissoes'

// Protege /inventario — libera pra quem administra (visão geral) ou pra
// quem foi colocado numa equipe de contagem (ver [[podeAcessarInventario]]).
export function RotaInventario({ children }: { children: ReactNode }) {
  const { session, profile, carregando } = useAuth()

  if (carregando) return null
  if (!session || !profile) return <Navigate to="/login" replace />
  if (!podeAcessarInventario(profile)) {
    return <Navigate to={rotaInicialPara(profile)} replace />
  }
  return <>{children}</>
}
