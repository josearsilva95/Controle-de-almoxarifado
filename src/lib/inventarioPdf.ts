import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { compararContagens } from './inventarioComparacao'
import { rotuloDeposito } from './depositos'
import type { EstoqueContagem, EstoqueItem } from '../types/database'

export function gerarPdfInventario(itens: EstoqueItem[], contagens: EstoqueContagem[]) {
  const doc = new jsPDF({ orientation: 'landscape' })
  const linhas = compararContagens(itens, contagens)

  doc.setFontSize(16)
  doc.text('Controle de Movimentação', 14, 16)
  doc.setFontSize(12)
  doc.text('Inventário — comparação de contagens', 14, 23)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${itens.length} itens`, 14, 29)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 34,
    head: [
      ['Código', 'Descrição', 'Categoria', 'Depósito', 'Lote(s)', 'Qtd. sistema', 'Equipe 1', 'Equipe 2', 'Equipe 3 (final)'],
    ],
    body: linhas.map((l) => [
      l.item.codigo,
      l.item.descricao,
      l.item.categoria || '—',
      rotuloDeposito(l.item.deposito),
      l.item.lotes || '—',
      l.sistema != null ? String(l.sistema) : '—',
      l.equipe1 != null ? String(l.equipe1) : '—',
      l.equipe2 != null ? String(l.equipe2) : '—',
      l.equipe3 != null ? String(l.equipe3) : '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 91, 219], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 1.5 },
  })

  doc.save(`inventario-${new Date().toISOString().slice(0, 10)}.pdf`)
}
