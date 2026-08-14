import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { rotuloDeposito } from './depositos'
import type { EstoqueItem } from '../types/database'

export function gerarPdfEstoque(itens: EstoqueItem[], deposito: string) {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text('Controle de Movimentação', 14, 18)
  doc.setFontSize(12)
  doc.text(`Estoque — conferência (${deposito})`, 14, 26)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${itens.length} itens`, 14, 32)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 38,
    head: [['Código', 'Descrição', 'Depósito', 'Qtd. sistema', 'Qtd. conferida']],
    body: itens.map((item) => [
      item.codigo,
      item.descricao,
      rotuloDeposito(item.deposito),
      item.quantidade != null ? String(item.quantidade) : '—',
      '',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 91, 219] },
    columnStyles: { 4: { cellWidth: 30 } },
  })

  doc.save(`estoque-${new Date().toISOString().slice(0, 10)}.pdf`)
}
