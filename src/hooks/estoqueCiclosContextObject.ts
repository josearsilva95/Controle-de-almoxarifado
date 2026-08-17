import { createContext } from 'react'
import type { EstoqueCiclo, EstoqueCicloItemComItem } from '../types/database'

export interface EstoqueCiclosContextValue {
  ciclo: EstoqueCiclo | null
  itens: EstoqueCicloItemComItem[]
  carregando: boolean
  recarregar: () => void
}

export const EstoqueCiclosContext = createContext<EstoqueCiclosContextValue | undefined>(undefined)
