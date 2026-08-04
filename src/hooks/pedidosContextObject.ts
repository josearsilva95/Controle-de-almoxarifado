import { createContext } from 'react'
import type { Pedido } from '../types/database'

export interface PedidosContextValue {
  pedidos: Pedido[]
  carregando: boolean
}

export const PedidosContext = createContext<PedidosContextValue | undefined>(undefined)
