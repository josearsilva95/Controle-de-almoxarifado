import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ResultadoMedicaoChapa } from './chapaMedicao'

// Relatório de uma medição de chapa — foto original + desenho técnico
// alinhado (com cotas) + tabela de medidas. Uma página, retrato (mesmo
// padrão do resto do app: jsPDF programático, sem depender do diálogo de
// impressão do navegador).
export function gerarPdfChapa(r: ResultadoMedicaoChapa, nomeArquivo: string) {
  const doc = new jsPDF({ orientation: 'portrait' })
  const largura = doc.internal.pageSize.getWidth()

  doc.setFontSize(16)
  doc.text('Relatório de Medição — Retalho de Chapa', 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`${r.dataHora}${r.codigoPeca ? ' · Código: ' + r.codigoPeca : ''}`, 14, 22)
  doc.setTextColor(0)

  const larguraImg = (largura - 28) / 2
  doc.setFontSize(9)
  doc.text('Foto original', 14, 30)
  doc.addImage(r.imagemDataUrl, 'JPEG', 14, 33, larguraImg, larguraImg * 0.75)
  doc.text('Desenho técnico (alinhado)', 14 + larguraImg + 6, 30)
  doc.addImage(r.desenhoDataUrl, 'PNG', 14 + larguraImg + 6, 33, larguraImg, larguraImg * 0.6)

  const linhas: [string, string][] = []
  if (r.shapeMode === 'circular') {
    linhas.push(['Diâmetro (área real)', `${r.diametroAreaMm?.toFixed(1)} mm`])
    linhas.push(['Diâmetro (retângulo)', `${r.diametroBboxMm?.toFixed(1)} mm`])
  } else {
    linhas.push(['Largura', `${r.larguraMm.toFixed(1)} mm`])
    linhas.push(['Comprimento', `${r.comprimentoMm.toFixed(1)} mm`])
  }
  linhas.push(['Área real', `${r.areaMm2.toFixed(0)} mm²`])
  linhas.push(['Aproveitamento', `${r.aproveitamento.toFixed(1)}%`])
  linhas.push(['Ângulo na foto', `${r.anguloDeg.toFixed(1)}°`])
  linhas.push(['Escala / calibração', r.metodoEscala])
  if (r.calcularPeso && r.pesoKg != null) {
    linhas.push(['Material', r.materialLabel ?? '—'])
    linhas.push(['Espessura', `${r.espessuraMm?.toFixed(1)} mm`])
    linhas.push(['Peso estimado', `${r.pesoKg.toFixed(3)} kg`])
  }

  autoTable(doc, {
    startY: 33 + larguraImg * 0.75 + 8,
    head: [['Medida', 'Valor']],
    body: linhas,
    theme: 'striped',
    headStyles: { fillColor: [59, 91, 219], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2.5 },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  doc.setFontSize(7.5)
  doc.setTextColor(120)
  doc.text(
    doc.splitTextToSize(
      'Medição estimada por visão computacional a partir de foto (ferramenta local, sem servidor). ' +
        `Sujeita a erro de foto/iluminação/perspectiva — confira com instrumento em caso de uso crítico. Arquivo: ${nomeArquivo}`,
      largura - 28
    ),
    14,
    finalY + 8
  )

  doc.save(`${nomeArquivo}.pdf`)
}
