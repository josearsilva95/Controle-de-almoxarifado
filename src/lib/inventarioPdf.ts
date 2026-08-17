import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CellHookData } from 'jspdf-autotable'
import { compararContagens, compararTotaisPorItem } from './inventarioComparacao'
import type { LinhaItem, LinhaLote } from './inventarioComparacao'
import { rotuloDeposito } from './depositos'
import type { EstoqueContagem, EstoqueItem } from '../types/database'

const VERMELHO_DIVERGENCIA: [number, number, number] = [185, 28, 28]

function novoDocInventario(subtitulo: string, totalLinhas: number) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16)
  doc.text('Controle de Movimentação', 14, 16)
  doc.setFontSize(12)
  doc.text(subtitulo, 14, 23)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${totalLinhas} itens`, 14, 29)
  doc.setTextColor(0)
  return doc
}

// Pinta de vermelho a linha inteira quando o item/lote tem alguma
// divergência — mesmo sinal visual usado nos alertas em tela.
function destacarLinhas<T>(linhas: T[], divergente: (l: T) => boolean) {
  return (data: CellHookData) => {
    if (data.section !== 'body') return
    const linha = linhas[data.row.index]
    if (linha && divergente(linha)) {
      data.cell.styles.textColor = VERMELHO_DIVERGENCIA
    }
  }
}

// Relatório geral, um item por linha — soma dos lotes de cada equipe
// comparada com a quantidade oficial do sistema.
export function gerarPdfInventario(itens: EstoqueItem[], contagens: EstoqueContagem[]) {
  const linhas: LinhaItem[] = compararTotaisPorItem(itens, contagens)
  const doc = novoDocInventario('Inventário — comparação de contagens (geral)', linhas.length)

  autoTable(doc, {
    startY: 34,
    head: [['Código', 'Descrição', 'Categoria', 'Depósito', 'Lote(s)', 'Qtd. sistema', 'Equipe 1 (total)', 'Equipe 2 (total)']],
    body: linhas.map((l) => [
      l.item.codigo,
      l.item.descricao,
      l.item.categoria || '—',
      rotuloDeposito(l.item.deposito),
      l.item.lotes || '—',
      l.sistema != null ? String(l.sistema) : '—',
      l.equipe1Total != null ? String(l.equipe1Total) : '—',
      l.equipe2Total != null ? String(l.equipe2Total) : '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 91, 219], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 1.5 },
    didParseCell: destacarLinhas(linhas, (l) => l.divergeSistemaEquipe1 || l.divergeSistemaEquipe2),
  })

  doc.save(`inventario-geral-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// Relatório só do que uma equipe (1 ou 2) contou — um lote por linha,
// não mostra a outra equipe.
export function gerarPdfInventarioEquipe(itens: EstoqueItem[], contagens: EstoqueContagem[], equipe: 'equipe_1' | 'equipe_2') {
  const numero = equipe === 'equipe_1' ? '1' : '2'
  const linhas = compararContagens(itens, contagens).filter((l) =>
    equipe === 'equipe_1' ? l.equipe1 != null : l.equipe2 != null
  )
  const doc = novoDocInventario(`Inventário — contagem da Equipe ${numero}`, linhas.length)

  autoTable(doc, {
    startY: 34,
    head: [['Código', 'Descrição', 'Categoria', 'Depósito', 'Lote', 'Qtd. sistema', `Qtd. Equipe ${numero}`]],
    body: linhas.map((l) => [
      l.item.codigo,
      l.item.descricao,
      l.item.categoria || '—',
      rotuloDeposito(l.item.deposito),
      l.temLote ? l.lote : '—',
      l.item.quantidade != null ? String(l.item.quantidade) : '—',
      String(equipe === 'equipe_1' ? l.equipe1 : l.equipe2),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 91, 219], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 1.5 },
  })

  doc.save(`inventario-equipe-${numero}-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// Relatório das divergências (equipe 1 x equipe 2), um lote por linha —
// pra equipe 3 trabalhar em cima. Mostra as duas contagens, o saldo real
// do sistema (contexto pra resolver) e a resolução final daquele lote.
export function gerarPdfDivergencias(itens: EstoqueItem[], contagens: EstoqueContagem[]) {
  const linhas: LinhaLote[] = compararContagens(itens, contagens).filter((l) => l.divergeEntreEquipes)
  const doc = novoDocInventario('Inventário — divergências (Equipe 3)', linhas.length)

  autoTable(doc, {
    startY: 34,
    head: [['Código', 'Descrição', 'Categoria', 'Depósito', 'Lote', 'Qtd. sistema', 'Equipe 1', 'Equipe 2', 'Equipe 3 (final)']],
    body: linhas.map((l) => [
      l.item.codigo,
      l.item.descricao,
      l.item.categoria || '—',
      rotuloDeposito(l.item.deposito),
      l.temLote ? l.lote : '—',
      l.item.quantidade != null ? String(l.item.quantidade) : '—',
      String(l.equipe1),
      String(l.equipe2),
      l.equipe3 != null ? String(l.equipe3) : '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 91, 219], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 1.5 },
    didParseCell: destacarLinhas(linhas, () => true),
  })

  doc.save(`inventario-divergencias-${new Date().toISOString().slice(0, 10)}.pdf`)
}
