import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { rotaInicialPara } from '../lib/rotas'
import { podeAdministrar } from '../lib/permissoes'

// Protege as rotas /admin/* — libera tanto para role='admin' quanto para
// líderes com lider_geral=true (ver [[podeAdministrar]]).
export function RotaAdmin({ children }: { children: ReactNode }) {
  const { session, profile, carregando } = useAuth()

  if (carregando) return null
  if (!session || !profile) return <Navigate to="/login" replace />
  if (!podeAdministrar(profile)) {
    return <Navigate to={rotaInicialPara(profile)} replace />
  }
  return <>{children}</>
}
