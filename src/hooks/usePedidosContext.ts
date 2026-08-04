import { useContext } from 'react'
import { PedidosContext } from './pedidosContextObject'

export function usePedidosContext() {
  const context = useContext(PedidosContext)
  if (!context) throw new Error('usePedidosContext deve ser usado dentro de um PedidosProvider')
  return context
}
