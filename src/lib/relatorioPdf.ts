import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDuracao } from './tempo'

export interface ColaboradorRelatorioPdf {
  nome: string
  finalizadas: number
  tempoTotalSegundos: number
}

export interface DadosRelatorioMensal {
  mesReferencia: string
  totalRequisicoes: number
  urgentes: number
  medias: number
  naoUrgentes: number
  finalizadas: number
  entregues: number
  tempoMedioSeparacaoSegundos: number
  tempoMedioPorRequisicaoSegundos: number
  colaboradores: ColaboradorRelatorioPdf[]
}

export function gerarRelatorioMensalPdf(dados: DadosRelatorioMensal) {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text('Controle de Movimentação', 14, 18)
  doc.setFontSize(12)
  doc.text(`Relatório mensal — ${dados.mesReferencia}`, 14, 26)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 32)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 38,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de requisições no mês', String(dados.totalRequisicoes)],
      ['Urgentes', String(dados.urgentes)],
      ['Médias', String(dados.medias)],
      ['Não urgentes', String(dados.naoUrgentes)],
      ['Finalizadas', String(dados.finalizadas)],
      ['Entregues', String(dados.entregues)],
      ['Tempo médio de separação', formatDuracao(dados.tempoMedioSeparacaoSegundos)],
      ['Tempo médio por requisição', formatDuracao(dados.tempoMedioPorRequisicaoSegundos)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 91, 219] },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  doc.setFontSize(12)
  doc.text('Desempenho por colaborador', 14, finalY + 12)

  autoTable(doc, {
    startY: finalY + 16,
    head: [['Colaborador', 'Finalizadas no mês', 'Tempo total trabalhado']],
    body: dados.colaboradores.map((c) => [c.nome, String(c.finalizadas), formatDuracao(c.tempoTotalSegundos)]),
    theme: 'striped',
    headStyles: { fillColor: [59, 91, 219] },
  })

  const slug = dados.mesReferencia.toLowerCase().replace(/\s+/g, '-')
  doc.save(`relatorio-${slug}.pdf`)
}
