import type { Deposito } from '../types/database'

export const DEPOSITOS: Deposito[] = ['deposito_1', 'deposito_2', 'deposito_3']

const ROTULOS: Record<Deposito, string> = {
  deposito_1: 'Central',
  deposito_2: 'Planos',
  deposito_3: 'Não Planos',
}

export function rotuloDeposito(deposito: Deposito | null): string {
  if (!deposito) return '—'
  return ROTULOS[deposito]
}
