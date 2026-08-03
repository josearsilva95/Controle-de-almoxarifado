import type { CSSProperties } from 'react'
import { CORES, rotuloUrgencia } from '../lib/cores'
import type { Urgencia } from '../types/database'

export function UrgenciaBadge({ urgencia }: { urgencia: Urgencia }) {
  const clara = urgencia === 'nao_urgente'
  return (
    <span
      className={`badge${clara ? ' badge-clara' : ''}`}
      style={{ '--cor-status': CORES[urgencia] } as CSSProperties}
    >
      {rotuloUrgencia(urgencia)}
    </span>
  )
}
