import * as XLSX from 'xlsx'
import { compararContagens } from './inventarioComparacao'
import { rotuloDeposito } from './depositos'
import type { EstoqueContagem, EstoqueItem } from '../types/database'

export function gerarExcelInventario(itens: EstoqueItem[], contagens: EstoqueContagem[]) {
  const linhas = compararContagens(itens, contagens)

  const dados = linhas.map((l) => ({
    Código: l.item.codigo,
    Descrição: l.item.descricao,
    Categoria: l.item.categoria ?? '',
    Depósito: rotuloDeposito(l.item.deposito),
    'Qtd. Sistema': l.sistema ?? '',
    'Equipe 1': l.equipe1 ?? '',
    'Equipe 2': l.equipe2 ?? '',
    'Equipe 3 (final)': l.equipe3 ?? '',
    'Diverge Sistema x Equipe 1': l.divergeSistemaEquipe1 ? 'Sim' : 'Não',
    'Diverge Sistema x Equipe 2': l.divergeSistemaEquipe2 ? 'Sim' : 'Não',
    'Diverge Equipe 1 x Equipe 2': l.divergeEntreEquipes ? 'Sim' : 'Não',
  }))

  const planilha = XLSX.utils.json_to_sheet(dados)
  planilha['!cols'] = [
    { wch: 14 },
    { wch: 45 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
  ]

  const livro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(livro, planilha, 'Inventário')
  XLSX.writeFile(livro, `inventario-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
