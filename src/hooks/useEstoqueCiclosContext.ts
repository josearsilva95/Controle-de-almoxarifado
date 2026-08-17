import { useContext } from 'react'
import { EstoqueCiclosContext } from './estoqueCiclosContextObject'

export function useEstoqueCiclosContext() {
  const context = useContext(EstoqueCiclosContext)
  if (!context) throw new Error('useEstoqueCiclosContext deve ser usado dentro de um EstoqueCiclosProvider')
  return context
}
