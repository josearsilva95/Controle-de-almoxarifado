import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { EstoqueContagem, EstoqueItem } from '../types/database'

export function gerarPdfInventario(itens: EstoqueItem[], contagens: EstoqueContagem[]) {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text('Controle de Movimentação', 14, 18)
  doc.setFontSize(12)
  doc.text('Inventário — comparação de contagens', 14, 26)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${itens.length} itens`, 14, 32)
  doc.setTextColor(0)

  const porItem = new Map<string, Partial<Record<EstoqueContagem['equipe'], number>>>()
  for (const c of contagens) {
    const atual = porItem.get(c.item_id) ?? {}
    atual[c.equipe] = c.quantidade
    porItem.set(c.item_id, atual)
  }

  autoTable(doc, {
    startY: 38,
    head: [['Código', 'Descrição', 'Qtd. sistema', 'Equipe 1', 'Equipe 2', 'Equipe 3 (final)']],
    body: itens.map((item) => {
      const c = porItem.get(item.id) ?? {}
      return [
        item.codigo,
        item.descricao,
        item.quantidade != null ? String(item.quantidade) : '—',
        c.equipe_1 != null ? String(c.equipe_1) : '—',
        c.equipe_2 != null ? String(c.equipe_2) : '—',
        c.equipe_3 != null ? String(c.equipe_3) : '—',
      ]
    }),
    theme: 'striped',
    headStyles: { fillColor: [59, 91, 219] },
    styles: { fontSize: 8 },
  })

  doc.save(`inventario-${new Date().toISOString().slice(0, 10)}.pdf`)
}
