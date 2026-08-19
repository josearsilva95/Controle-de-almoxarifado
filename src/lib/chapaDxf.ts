// Gera o texto de um arquivo DXF (formato POLYLINE, compatível com AutoCAD
// e praticamente qualquer CAD) a partir do contorno da peça em mm.
export function gerarDXF(contornoMm: [number, number][]): string {
  const linhas: string[] = []
  const add = (codigo: number, valor: string | number) => {
    linhas.push(String(codigo))
    linhas.push(String(valor))
  }
  add(0, 'SECTION')
  add(2, 'HEADER')
  add(9, '$INSUNITS')
  add(70, 4) // 4 = milímetros
  add(0, 'ENDSEC')
  add(0, 'SECTION')
  add(2, 'ENTITIES')
  add(0, 'POLYLINE')
  add(8, 'PECA')
  add(66, 1)
  add(70, 1)
  for (const [x, y] of contornoMm) {
    add(0, 'VERTEX')
    add(8, 'PECA')
    add(10, x.toFixed(3))
    add(20, y.toFixed(3))
    add(30, '0.0')
  }
  add(0, 'SEQEND')
  add(0, 'ENDSEC')
  add(0, 'EOF')
  return linhas.join('\n')
}

export function baixarDXF(contornoMm: [number, number][], nomeArquivo: string) {
  const dxfTexto = gerarDXF(contornoMm)
  const blob = new Blob([dxfTexto], { type: 'application/dxf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo + '.dxf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
