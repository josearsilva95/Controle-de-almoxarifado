import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { rotaInicialPara } from '../lib/rotas'
import type { Role } from '../types/database'

export function RotaProtegida({ role, children }: { role: Role; children: ReactNode }) {
  const { session, profile, carregando } = useAuth()

  if (carregando) return null
  if (!session || !profile) return <Navigate to="/login" replace />
  if (profile.role !== role) {
    return <Navigate to={rotaInicialPara(profile.role)} replace />
  }
  return <>{children}</>
}
