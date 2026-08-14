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

// Paleta categórica validada (CVD-safe) exclusiva para o gráfico de distribuição
// por depósito — não reaproveita as cores de urgência/status para não confundir
// as duas leituras quando os gráficos aparecem lado a lado.
export const COR_DEPOSITO: Record<Deposito, string> = {
  deposito_1: '#2a78d6',
  deposito_2: '#1baf7a',
  deposito_3: '#e87ba4',
}
