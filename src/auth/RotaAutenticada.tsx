import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

// Libera pra qualquer usuário logado, sem exigir papel/acesso específico —
// usado por ferramentas soltas (ex: Medição de Chapas) que não fazem parte
// de nenhum módulo restrito.
export function RotaAutenticada({ children }: { children: ReactNode }) {
  const { session, profile, carregando } = useAuth()

  if (carregando) return null
  if (!session || !profile) return <Navigate to="/login" replace />
  return <>{children}</>
}
