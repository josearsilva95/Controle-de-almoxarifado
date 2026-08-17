import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { rotuloDeposito } from './depositos'
import type { EstoqueItem } from '../types/database'

export function gerarPdfEstoque(itens: EstoqueItem[], rotulo: string) {
  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(16)
  doc.text('Controle de Movimentação', 14, 16)
  doc.setFontSize(12)
  doc.text(`Estoque — conferência (${rotulo})`, 14, 23)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${itens.length} itens`, 14, 29)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 34,
    head: [['Código', 'Descrição', 'Categoria', 'Depósito', 'Lote(s)', 'Qtd. sistema', 'Qtd. conferida']],
    body: itens.map((item) => [
      item.codigo,
      item.descricao,
      item.categoria || '—',
      rotuloDeposito(item.deposito),
      item.lotes || '—',
      item.quantidade != null ? String(item.quantidade) : '—',
      '',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 91, 219] },
    columnStyles: { 6: { cellWidth: 35 } },
  })

  doc.save(`estoque-${new Date().toISOString().slice(0, 10)}.pdf`)
}
