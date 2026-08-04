import type { MotivoPausa } from '../types/database'

export const MOTIVOS_PAUSA: MotivoPausa[] = ['falta_estoque', 'empilhadeira', 'equipamento_quebrado']

const ROTULOS: Record<MotivoPausa, string> = {
  falta_estoque: 'Falta de estoque',
  empilhadeira: 'Empilhadeira',
  equipamento_quebrado: 'Equipamento quebrado',
}

export function rotuloMotivoPausa(motivo: MotivoPausa | null): string | null {
  if (!motivo) return null
  return ROTULOS[motivo]
}
