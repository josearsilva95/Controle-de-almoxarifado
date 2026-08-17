import * as XLSX from 'xlsx'
import { compararContagens, compararTotaisPorItem } from './inventarioComparacao'
import { rotuloDeposito } from './depositos'
import type { EstoqueContagem, EstoqueItem } from '../types/database'

// Relatório geral, um item por linha — soma dos lotes de cada equipe
// comparada com a quantidade oficial do sistema.
export function gerarExcelInventario(itens: EstoqueItem[], contagens: EstoqueContagem[]) {
  const linhas = compararTotaisPorItem(itens, contagens)

  const dados = linhas.map((l) => ({
    Código: l.item.codigo,
    Descrição: l.item.descricao,
    Categoria: l.item.categoria ?? '',
    Depósito: rotuloDeposito(l.item.deposito),
    'Lote(s)': l.item.lotes ?? '',
    'Qtd. Sistema': l.sistema ?? '',
    'Equipe 1 (total)': l.equipe1Total ?? '',
    'Equipe 2 (total)': l.equipe2Total ?? '',
    'Diverge Sistema x Equipe 1': l.divergeSistemaEquipe1 ? 'Sim' : 'Não',
    'Diverge Sistema x Equipe 2': l.divergeSistemaEquipe2 ? 'Sim' : 'Não',
  }))

  const planilha = XLSX.utils.json_to_sheet(dados)
  planilha['!cols'] = [
    { wch: 14 },
    { wch: 45 },
    { wch: 20 },
    { wch: 12 },
    { wch: 24 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 22 },
    { wch: 22 },
  ]

  const livro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(livro, planilha, 'Inventário')
  XLSX.writeFile(livro, `inventario-geral-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// Só o que uma equipe (1 ou 2) contou — um lote por linha, não mostra a
// outra equipe.
export function gerarExcelInventarioEquipe(itens: EstoqueItem[], contagens: EstoqueContagem[], equipe: 'equipe_1' | 'equipe_2') {
  const numero = equipe === 'equipe_1' ? '1' : '2'
  const linhas = compararContagens(itens, contagens).filter((l) =>
    equipe === 'equipe_1' ? l.equipe1 != null : l.equipe2 != null
  )

  const dados = linhas.map((l) => ({
    Código: l.item.codigo,
    Descrição: l.item.descricao,
    Categoria: l.item.categoria ?? '',
    Depósito: rotuloDeposito(l.item.deposito),
    Lote: l.temLote ? l.lote : '',
    Local: (equipe === 'equipe_1' ? l.localEquipe1 : l.localEquipe2) ?? '',
    'Qtd. Sistema': l.item.quantidade ?? '',
    [`Qtd. Equipe ${numero}`]: equipe === 'equipe_1' ? l.equipe1 : l.equipe2,
  }))

  const planilha = XLSX.utils.json_to_sheet(dados)
  planilha['!cols'] = [{ wch: 14 }, { wch: 45 }, { wch: 20 }, { wch: 12 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 14 }]

  const livro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(livro, planilha, `Equipe ${numero}`)
  XLSX.writeFile(livro, `inventario-equipe-${numero}-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// Só as divergências (equipe 1 x equipe 2), um lote por linha — pra equipe
// 3 trabalhar em cima. Inclui o saldo real do sistema, pra dar contexto na
// hora de resolver.
export function gerarExcelDivergencias(itens: EstoqueItem[], contagens: EstoqueContagem[]) {
  const linhas = compararContagens(itens, contagens).filter((l) => l.divergeEntreEquipes)

  const dados = linhas.map((l) => ({
    Código: l.item.codigo,
    Descrição: l.item.descricao,
    Categoria: l.item.categoria ?? '',
    Depósito: rotuloDeposito(l.item.deposito),
    Lote: l.temLote ? l.lote : '',
    'Qtd. Sistema': l.item.quantidade ?? '',
    'Equipe 1': l.equipe1,
    'Local Equipe 1': l.localEquipe1 ?? '',
    'Equipe 2': l.equipe2,
    'Local Equipe 2': l.localEquipe2 ?? '',
    'Equipe 3 (final)': l.equipe3 ?? '',
  }))

  const planilha = XLSX.utils.json_to_sheet(dados)
  planilha['!cols'] = [
    { wch: 14 },
    { wch: 45 },
    { wch: 20 },
    { wch: 12 },
    { wch: 24 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 15 },
  ]

  const livro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(livro, planilha, 'Divergências')
  XLSX.writeFile(livro, `inventario-divergencias-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
