import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDataHora } from './tempo'

export interface LinhaContagemPdf {
  codigo: string
  descricao: string
  categoria: string | null
  quantidade: number
  contadoPor: string
  contadoEm: string
}

export function gerarPdfContagem(linhas: LinhaContagemPdf[]) {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text('Controle de Movimentação', 14, 18)
  doc.setFontSize(12)
  doc.text('Auditoria de estoque — contagem consolidada', 14, 26)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${linhas.length} itens contados`, 14, 32)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 38,
    head: [['Código', 'Descrição', 'Categoria', 'Qtd. contada', 'Contado por', 'Quando']],
    body: linhas.map((l) => [
      l.codigo,
      l.descricao,
      l.categoria || '—',
      String(l.quantidade),
      l.contadoPor,
      formatDataHora(l.contadoEm),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 91, 219] },
  })

  doc.save(`auditoria-estoque-${new Date().toISOString().slice(0, 10)}.pdf`)
}
