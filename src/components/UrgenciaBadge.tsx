import { CORES, rotuloUrgencia } from '../lib/cores'
import type { Urgencia } from '../types/database'

export function UrgenciaBadge({ urgencia }: { urgencia: Urgencia }) {
  const clara = urgencia === 'nao_urgente'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        clara ? 'border border-border text-foreground' : 'text-white'
      }`}
      style={{ backgroundColor: CORES[urgencia] }}
    >
      {rotuloUrgencia(urgencia)}
    </span>
  )
}
