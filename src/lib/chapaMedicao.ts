import {
  computeBlueMask,
  computeWhiteMask,
  construirContornoMm,
  construirDesenhoTecnico,
  erode,
  labelComponents,
  morphClose,
  morphOpen,
  orientedRect,
  rgbToHsv,
} from './chapaVisao'
import type { ComponenteConectado, RetanguloOrientado, Thresholds } from './chapaVisao'

export type FormaChapa = 'irregular' | 'circular'

export interface GabaritoLocalizado {
  pxPorCm: number
  bbox: ComponenteConectado
}

export interface ResultadoMedicaoChapa {
  dataHora: string
  codigoPeca: string
  imagemDataUrl: string
  desenhoDataUrl: string
  contornoMm: [number, number][]
  shapeMode: FormaChapa
  larguraMm: number
  comprimentoMm: number
  areaMm2: number
  areaEnvelopeMm2: number
  aproveitamento: number
  diametroAreaMm: number | null
  diametroBboxMm: number | null
  anguloDeg: number
  pxPorMm: number
  metodoEscala: string
  calcularPeso: boolean
  espessuraMm: number | null
  densidade: number | null
  materialLabel: string | null
  materialSlug: string | null
  pesoKg: number | null
}

// Os raios de morfologia foram calibrados numa imagem de referência de
// 750px de largura — escalamos proporcionalmente pra imagens maiores,
// senão o "fechamento" de buracos fica proporcionalmente mais fraco em
// fotos de maior resolução.
export function raioEscalado(raioBase750: number, imgW: number): number {
  return Math.max(2, Math.round(raioBase750 * (imgW / 750)))
}

export function localizarGabarito(
  imgData: ImageData,
  imgW: number,
  imgH: number,
  gabValueCm: number,
  sMax: number,
  vMin: number
): GabaritoLocalizado | null {
  if (!gabValueCm || gabValueCm <= 0) return null

  let mask = computeWhiteMask(imgData, imgW, imgH, sMax, vMin)
  mask = morphOpen(mask, imgW, imgH, raioEscalado(3, imgW))
  mask = morphClose(mask, imgW, imgH, raioEscalado(3, imgW))

  const { comps } = labelComponents(mask, imgW, imgH)
  const minAreaPx = Math.max(200, imgW * imgH * 0.001)
  const candidatos = comps.filter((c) => {
    if (c.count < minAreaPx) return false
    const bw = c.maxX - c.minX + 1
    const bh = c.maxY - c.minY + 1
    const aspecto = Math.min(bw, bh) / Math.max(bw, bh)
    return aspecto >= 0.65
  })
  if (candidatos.length === 0) return null

  const gab = candidatos.reduce((a, b) => (a.count > b.count ? a : b))
  const bw = gab.maxX - gab.minX + 1
  const bh = gab.maxY - gab.minY + 1
  const ladoMedioPx = (bw + bh) / 2
  const pxPorCm = ladoMedioPx / gabValueCm
  return { pxPorCm, bbox: gab }
}

interface ProcessarChapaParams {
  imgData: ImageData
  imgW: number
  imgH: number
  thresholds: Thresholds
  modo: 'gabarito' | 'manual'
  calibracao: GabaritoLocalizado | null
  refWidthCm: number | null
  satMinPeca: number
  aparoBordaMm: number
}

export interface ProcessamentoChapa {
  plate: ComponenteConectado
  plateW: number
  plateH: number
  pxPorMm: number
  chapaMask: Uint8Array
  subW: number
  subH: number
  roiMinX: number
  roiMinY: number
  rect: RetanguloOrientado
  larguraMm: number
  comprimentoMm: number
  areaMm2: number
  areaEnvelopeMm2: number
  aproveitamento: number
  points: Float32Array
}

export function processarChapa(params: ProcessarChapaParams): ProcessamentoChapa | { erro: string } {
  const { imgData, imgW, imgH, thresholds, modo, calibracao, refWidthCm, satMinPeca, aparoBordaMm } = params

  let blueMask = computeBlueMask(imgData, imgW, imgH, thresholds)

  const pxPorMmAntecipado = modo === 'gabarito' && calibracao ? calibracao.pxPorCm / 10 : null
  const raioBlueMm = 2.5
  const raioBluePx = pxPorMmAntecipado
    ? Math.max(2, Math.round(raioBlueMm * pxPorMmAntecipado))
    : raioEscalado(10, imgW)

  blueMask = morphClose(blueMask, imgW, imgH, raioBluePx)
  blueMask = morphOpen(blueMask, imgW, imgH, raioBluePx)

  const { comps: blueComps } = labelComponents(blueMask, imgW, imgH)
  if (blueComps.length === 0) return { erro: 'Não encontrei a placa azul. Ajuste os sliders de cor e tente de novo.' }

  const plate = blueComps.reduce((a, b) => (a.count > b.count ? a : b))
  const plateW = plate.maxX - plate.minX + 1
  const plateH = plate.maxY - plate.minY + 1

  const pxPorMm = pxPorMmAntecipado || plateW / (refWidthCm || 1) / 10

  const marginX = Math.round(plateW * 0.05)
  const marginY = Math.round(plateH * 0.03)
  const roiMinX = plate.minX + marginX
  const roiMaxX = plate.maxX - marginX
  const roiMinY = plate.minY + marginY
  const roiMaxY = plate.maxY - marginY
  const subW = roiMaxX - roiMinX + 1
  const subH = roiMaxY - roiMinY + 1

  const subMask = new Uint8Array(subW * subH)

  let gabMinX = -1
  let gabMaxX = -1
  let gabMinY = -1
  let gabMaxY = -1
  if (calibracao) {
    const g = calibracao.bbox
    const folgaGab = Math.round((g.maxX - g.minX) * 0.15)
    gabMinX = g.minX - folgaGab
    gabMaxX = g.maxX + folgaGab
    gabMinY = g.minY - folgaGab
    gabMaxY = g.maxY + folgaGab
  }

  for (let y = 0; y < subH; y++) {
    for (let x = 0; x < subW; x++) {
      const gx = roiMinX + x
      const gy = roiMinY + y
      if (gx >= gabMinX && gx <= gabMaxX && gy >= gabMinY && gy <= gabMaxY) {
        subMask[y * subW + x] = 0
        continue
      }
      const gi = gy * imgW + gx
      if (blueMask[gi] === 1) {
        subMask[y * subW + x] = 0
        continue
      }
      if (satMinPeca > 0) {
        const p = gi * 4
        const [, s] = rgbToHsv(imgData.data[p], imgData.data[p + 1], imgData.data[p + 2])
        subMask[y * subW + x] = s >= satMinPeca ? 1 : 0
      } else {
        subMask[y * subW + x] = 1
      }
    }
  }

  const raioChapaMm = 1.0
  const raioChapaPx = Math.max(2, Math.round(raioChapaMm * pxPorMm))
  let cleanSub = morphOpen(subMask, subW, subH, raioChapaPx)
  cleanSub = morphClose(cleanSub, subW, subH, raioChapaPx)

  const { labels: subLabels, comps: subComps } = labelComponents(cleanSub, subW, subH)
  const MIN_AREA_PX = 400 * Math.pow(imgW / 750, 2)
  const validComps = subComps.filter((c) => c.count > MIN_AREA_PX)
  if (validComps.length === 0) {
    return { erro: 'Placa azul localizada, mas não encontrei a chapa dentro dela. Ajuste os sliders e tente novamente.' }
  }
  const chapaComp = validComps.reduce((a, b) => (a.count > b.count ? a : b))

  const aparoPx = Math.round(aparoBordaMm * pxPorMm)
  let chapaMask: Uint8Array = new Uint8Array(subW * subH)
  for (let i = 0; i < subW * subH; i++) chapaMask[i] = subLabels[i] === chapaComp.label ? 1 : 0
  if (aparoPx > 0) chapaMask = erode(chapaMask, subW, subH, aparoPx)

  let areaPx = 0
  for (let i = 0; i < subW * subH; i++) if (chapaMask[i] === 1) areaPx++
  if (areaPx < 20) {
    return { erro: 'Aparo de borda grande demais para o tamanho da peça — reduza o valor de "Aparar borda".' }
  }

  const points = new Float32Array(areaPx * 2)
  let pi = 0
  for (let y = 0; y < subH; y++) {
    for (let x = 0; x < subW; x++) {
      if (chapaMask[y * subW + x] === 1) {
        points[pi * 2] = roiMinX + x
        points[pi * 2 + 1] = roiMinY + y
        pi++
      }
    }
  }

  const rect = orientedRect(points)
  const larguraPx = Math.min(rect.widthPx, rect.heightPx)
  const comprimentoPx = Math.max(rect.widthPx, rect.heightPx)
  const larguraMm = larguraPx / pxPorMm
  const comprimentoMm = comprimentoPx / pxPorMm
  const areaMm2 = areaPx / (pxPorMm * pxPorMm)
  const areaEnvelopeMm2 = larguraMm * comprimentoMm
  const aproveitamento = (areaMm2 / areaEnvelopeMm2) * 100

  return {
    plate,
    plateW,
    plateH,
    pxPorMm,
    chapaMask,
    subW,
    subH,
    roiMinX,
    roiMinY,
    rect,
    larguraMm,
    comprimentoMm,
    areaMm2,
    areaEnvelopeMm2,
    aproveitamento,
    points,
  }
}

export function calcularPesoChapa(areaMm2: number, espessuraMm: number, densidade: number): number {
  // peso(kg) = área(mm²) x espessura(mm) x densidade(g/cm³) / 1e6
  return (areaMm2 * espessuraMm * densidade) / 1e6
}

// Monta o resultado final (com desenho técnico + contorno em mm) a partir
// do processamento — separado de processarChapa() pra deixar o cálculo
// pesado (morfologia/componentes) reaproveitável sem sempre desenhar.
export function montarResultado(params: {
  proc: ProcessamentoChapa
  shapeMode: FormaChapa
  imagemDataUrl: string
  codigoPeca: string
  metodoEscala: string
  calcularPeso: boolean
  espessuraMm: number | null
  densidade: number | null
  materialLabel: string | null
  materialSlug: string | null
}): ResultadoMedicaoChapa {
  const { proc, shapeMode, imagemDataUrl, codigoPeca, metodoEscala, calcularPeso, espessuraMm, densidade, materialLabel, materialSlug } =
    params

  let diametroAreaMm: number | null = null
  let diametroBboxMm: number | null = null
  if (shapeMode === 'circular') {
    diametroAreaMm = 2 * Math.sqrt(proc.areaMm2 / Math.PI)
    diametroBboxMm = (proc.larguraMm + proc.comprimentoMm) / 2
  }

  let pesoKg: number | null = null
  if (calcularPeso && espessuraMm && densidade) {
    pesoKg = calcularPesoChapa(proc.areaMm2, espessuraMm, densidade)
  }

  const desenhoDataUrl = construirDesenhoTecnico(proc.points, proc.rect, proc.pxPorMm, proc.larguraMm, proc.comprimentoMm)
  const contornoMm = construirContornoMm(proc.chapaMask, proc.subW, proc.subH, proc.roiMinX, proc.roiMinY, proc.rect, proc.pxPorMm)

  return {
    dataHora: new Date().toLocaleString('pt-BR'),
    codigoPeca,
    imagemDataUrl,
    desenhoDataUrl,
    contornoMm,
    shapeMode,
    larguraMm: proc.larguraMm,
    comprimentoMm: proc.comprimentoMm,
    areaMm2: proc.areaMm2,
    areaEnvelopeMm2: proc.areaEnvelopeMm2,
    aproveitamento: proc.aproveitamento,
    diametroAreaMm,
    diametroBboxMm,
    anguloDeg: proc.rect.angleDeg,
    pxPorMm: proc.pxPorMm,
    metodoEscala,
    calcularPeso,
    espessuraMm,
    densidade,
    materialLabel,
    materialSlug,
    pesoKg,
  }
}

// Desenha a visualização do resultado sobre o canvas (chapa em verde, placa
// em amarelo, retângulo de medida em vermelho, gabarito em ciano por cima
// de tudo — igual ao protótipo).
export function desenharResultado(
  displayCanvas: HTMLCanvasElement,
  baseCanvas: HTMLCanvasElement,
  imgW: number,
  imgH: number,
  proc: ProcessamentoChapa,
  gabaritoBbox: ComponenteConectado | null,
  label: string
) {
  const ctx = displayCanvas.getContext('2d')!
  ctx.drawImage(baseCanvas, 0, 0)

  const shot = ctx.getImageData(0, 0, imgW, imgH)
  for (let y = 0; y < proc.subH; y++) {
    for (let x = 0; x < proc.subW; x++) {
      if (proc.chapaMask[y * proc.subW + x] === 1) {
        const gx = proc.roiMinX + x
        const gy = proc.roiMinY + y
        const p = (gy * imgW + gx) * 4
        shot.data[p + 1] = Math.min(255, shot.data[p + 1] * 0.5 + 255 * 0.5)
      }
    }
  }
  ctx.putImageData(shot, 0, 0)

  ctx.strokeStyle = '#ffd23d'
  ctx.lineWidth = 3
  ctx.strokeRect(proc.plate.minX, proc.plate.minY, proc.plateW, proc.plateH)

  ctx.strokeStyle = '#ff4d4d'
  ctx.lineWidth = 3
  ctx.beginPath()
  proc.rect.corners.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.closePath()
  ctx.stroke()

  ctx.font = 'bold 20px monospace'
  ctx.fillStyle = '#ff4d4d'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 4
  const tx = proc.plate.minX + 10
  const ty = proc.plate.minY + 30
  ctx.strokeText(label, tx, ty)
  ctx.fillText(label, tx, ty)

  if (gabaritoBbox) {
    const gw = gabaritoBbox.maxX - gabaritoBbox.minX + 1
    const gh = gabaritoBbox.maxY - gabaritoBbox.minY + 1
    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 4
    ctx.strokeRect(gabaritoBbox.minX, gabaritoBbox.minY, gw, gh)
  }
}

export function desenharOverlayGabarito(
  displayCanvas: HTMLCanvasElement,
  baseCanvas: HTMLCanvasElement,
  gab: GabaritoLocalizado,
  gabValue: number,
  gabUnit: string
) {
  const ctx = displayCanvas.getContext('2d')!
  ctx.drawImage(baseCanvas, 0, 0)
  const bw = gab.bbox.maxX - gab.bbox.minX + 1
  const bh = gab.bbox.maxY - gab.bbox.minY + 1
  ctx.strokeStyle = '#00d4ff'
  ctx.lineWidth = 3
  ctx.strokeRect(gab.bbox.minX, gab.bbox.minY, bw, bh)
  ctx.font = 'bold 16px monospace'
  ctx.fillStyle = '#00d4ff'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 3
  const lbl = gabValue + gabUnit + ' de referência'
  ctx.strokeText(lbl, gab.bbox.minX, Math.max(14, gab.bbox.minY - 8))
  ctx.fillText(lbl, gab.bbox.minX, Math.max(14, gab.bbox.minY - 8))
}

export function desenharPreviewMascara(
  displayCanvas: HTMLCanvasElement,
  baseCanvas: HTMLCanvasElement,
  imgW: number,
  imgH: number,
  mask: Uint8Array
) {
  const ctx = displayCanvas.getContext('2d')!
  ctx.drawImage(baseCanvas, 0, 0)
  const overlay = ctx.getImageData(0, 0, imgW, imgH)
  for (let p = 0; p < mask.length; p++) {
    if (mask[p] === 1) {
      overlay.data[p * 4 + 0] = overlay.data[p * 4 + 0] * 0.3 + 255 * 0.7
      overlay.data[p * 4 + 1] = overlay.data[p * 4 + 1] * 0.3 + 210 * 0.7
      overlay.data[p * 4 + 2] = overlay.data[p * 4 + 2] * 0.3 + 40 * 0.7
    }
  }
  ctx.putImageData(overlay, 0, 0)
}

// Sugere um código pra nova peça baseado na espessura (ex: E3-001, E3-002...)
// — olha os códigos já existentes no estoque de retalhos pra não repetir.
export function gerarCodigoChapa(retalhosExistentes: { codigo: string }[], espessuraMm: number): string {
  const espTag = 'E' + String(espessuraMm).replace('.', '_')
  let maxSeq = 0
  for (const p of retalhosExistentes) {
    if (p.codigo && p.codigo.indexOf(espTag + '-') === 0) {
      const m = p.codigo.match(/-(\d+)$/)
      if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10))
    }
  }
  return espTag + '-' + String(maxSeq + 1).padStart(3, '0')
}

export function construirNomeArquivo(r: ResultadoMedicaoChapa): string {
  const dimPart =
    r.shapeMode === 'circular' ? 'diam' + Math.round(r.diametroAreaMm ?? 0) : Math.round(r.larguraMm) + 'x' + Math.round(r.comprimentoMm)
  const espPart = r.espessuraMm ? Math.round(r.espessuraMm * 10) / 10 + 'mm' : 'espNA'
  const partes = [r.materialSlug ?? 'Peca', dimPart, espPart]
  if (r.codigoPeca) partes.unshift(r.codigoPeca.replace(/[^a-zA-Z0-9-_]/g, ''))
  return partes.join('_').replace(/\s+/g, '')
}
