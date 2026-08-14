import type { EstoqueItem } from '../types/database'

// Busca por palavras, em qualquer ordem: cada palavra digitada precisa
// aparecer em algum lugar (código, descrição ou categoria) — não precisa ser
// um trecho contínuo nem a palavra inteira. "PARAF M16 X 50" acha
// "PARAFUSO SEXTAVADO M16 X 50 DIN...", mesmo abreviado e fora de ordem.
export function filtrarItensEstoque(itens: EstoqueItem[], busca: string): EstoqueItem[] {
  const termos = busca.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (termos.length === 0) return itens
  return itens.filter((item) => {
    const alvo = `${item.codigo} ${item.descricao} ${item.categoria ?? ''}`.toLowerCase()
    return termos.every((termo) => alvo.includes(termo))
  })
}
