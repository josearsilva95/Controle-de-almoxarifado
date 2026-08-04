import type { Deposito } from '../types/database'

export const DEPOSITOS: Deposito[] = ['deposito_1', 'deposito_2', 'deposito_3']

const ROTULOS: Record<Deposito, string> = {
  deposito_1: 'Depósito 1',
  deposito_2: 'Depósito 2',
  deposito_3: 'Depósito 3',
}

export function rotuloDeposito(deposito: Deposito | null): string {
  if (!deposito) return '—'
  return ROTULOS[deposito]
}
