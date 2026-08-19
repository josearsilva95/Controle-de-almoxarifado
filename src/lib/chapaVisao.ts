// Medição de chapas por visão computacional — peça fotografada sobre fundo
// azul (lona/placa), com um gabarito branco ou a própria placa de largura
// conhecida como referência de escala. Tudo roda no navegador (canvas +
// pixels), sem servidor. Portado do protótipo standalone medir_chapa.html —
// os algoritmos (HSV, Otsu, morfologia via imagem integral, componentes
// conectados, retângulo orientado por PCA, rastreio de contorno) são os
// mesmos, só reorganizados/tipados pro nosso padrão.

export interface Thresholds {
  hMin: number
  hMax: number
  sMin: number
  vMin: number
}

export interface ComponenteConectado {
  label: number
  count: number
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface RetanguloOrientado {
  widthPx: number
  heightPx: number
  angleDeg: number
  corners: [number, number][]
  meanX: number
  meanY: number
  theta: number
  minU: number
  minV: number
}

export interface CalibracaoAuto {
  hMin: number
  hMax: number
  sMin: number
  vMin: number
  modo: string
  picoHue: number
}

// ---------- cor ----------

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  const v = max
  return [h, s * 100, v * 100]
}

export function computeBlueMask(imageData: ImageData, w: number, h: number, th: Thresholds): Uint8Array {
  const data = imageData.data
  const mask = new Uint8Array(w * h)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const [hh, ss, vv] = rgbToHsv(data[i], data[i + 1], data[i + 2])
    if (hh >= th.hMin && hh <= th.hMax && ss >= th.sMin && vv >= th.vMin) mask[p] = 1
  }
  return mask
}

export function computeWhiteMask(imageData: ImageData, w: number, h: number, sMax: number, vMin: number): Uint8Array {
  const data = imageData.data
  const mask = new Uint8Array(w * h)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const [, ss, vv] = rgbToHsv(data[i], data[i + 1], data[i + 2])
    if (ss <= sMax && vv >= vMin) mask[p] = 1
  }
  return mask
}

// ---------- auto-calibração do fundo azul ----------

function otsuThreshold(valores: number[], nbins = 100): { limiar: number; popBaixo: number; popAlto: number } {
  const hist = new Float64Array(nbins)
  for (let i = 0; i < valores.length; i++) {
    let bin = Math.floor((valores[i] / 100) * nbins)
    if (bin >= nbins) bin = nbins - 1
    if (bin < 0) bin = 0
    hist[bin]++
  }
  const total = valores.length
  let somaTotal = 0
  for (let i = 0; i < nbins; i++) somaTotal += i * hist[i]
  let somaB = 0
  let wB = 0
  let maxVar = -1
  let limiarIdx = 0
  for (let i = 0; i < nbins; i++) {
    wB += hist[i]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    somaB += i * hist[i]
    const mB = somaB / wB
    const mF = (somaTotal - somaB) / wF
    const varEntre = wB * wF * (mB - mF) * (mB - mF)
    if (varEntre > maxVar) {
      maxVar = varEntre
      limiarIdx = i
    }
  }
  let popBaixo = 0
  for (let i = 0; i <= limiarIdx; i++) popBaixo += hist[i]
  const popAlto = total - popBaixo
  return { limiar: ((limiarIdx + 1) / nbins) * 100, popBaixo, popAlto }
}

function percentil(valoresOrdenados: number[], p: number): number {
  if (valoresOrdenados.length === 0) return 0
  const idx = Math.min(valoresOrdenados.length - 1, Math.max(0, Math.round((p / 100) * (valoresOrdenados.length - 1))))
  return valoresOrdenados[idx]
}

// Analisa a própria foto e devolve os melhores hMin/hMax/sMin/vMin pra esse
// fundo — null quando não achou um fundo azul reconhecível o bastante.
export function autoCalibrarFundo(imageData: ImageData, w: number, h: number): CalibracaoAuto | null {
  const data = imageData.data
  const n = w * h
  const hueArr = new Float32Array(n)
  const satArr = new Float32Array(n)
  const valArr = new Float32Array(n)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const [hh, ss, vv] = rgbToHsv(data[i], data[i + 1], data[i + 2])
    hueArr[p] = hh
    satArr[p] = ss
    valArr[p] = vv
  }

  const nbinsHue = 48
  const histHue = new Float64Array(nbinsHue)
  for (let p = 0; p < n; p++) {
    const hh = hueArr[p]
    if (hh >= 100 && hh <= 340 && satArr[p] > 6) {
      let bin = Math.floor(((hh - 100) / 240) * nbinsHue)
      if (bin >= nbinsHue) bin = nbinsHue - 1
      histHue[bin]++
    }
  }
  let picoIdx = 0
  let picoVal = -1
  for (let i = 0; i < nbinsHue; i++) {
    if (histHue[i] > picoVal) {
      picoVal = histHue[i]
      picoIdx = i
    }
  }
  const picoHue = 100 + ((picoIdx + 0.5) / nbinsHue) * 240

  const satPerto: number[] = []
  for (let p = 0; p < n; p++) {
    const hh = hueArr[p]
    if (hh < 100 || hh > 340 || satArr[p] <= 6) continue
    let dist = Math.abs(hh - picoHue)
    if (dist > 180) dist = 360 - dist
    if (dist <= 45) satPerto.push(satArr[p])
  }
  if (satPerto.length < 200) return null

  const { limiar, popBaixo, popAlto } = otsuThreshold(satPerto)
  const fracMaioria = Math.max(popBaixo, popAlto) / (popBaixo + popAlto)

  satPerto.sort((a, b) => a - b)
  let sMin: number
  let modo: string
  if (fracMaioria > 0.68 && popAlto > popBaixo) {
    sMin = limiar
    modo = 'bimodal (separou fundo de uma contaminação de sombra/reflexo)'
  } else {
    sMin = percentil(satPerto, 8)
    modo = 'contínuo (sem separação clara — usando a base da própria variação do fundo)'
  }

  const valDoFundo: number[] = []
  for (let p = 0; p < n; p++) {
    const hh = hueArr[p]
    if (hh < 100 || hh > 340) continue
    let dist = Math.abs(hh - picoHue)
    if (dist > 180) dist = 360 - dist
    if (dist <= 45 && satArr[p] >= sMin) valDoFundo.push(valArr[p])
  }
  valDoFundo.sort((a, b) => a - b)
  const vMin = Math.max(10, Math.min(25, percentil(valDoFundo, 3) - 5))

  const hMin = Math.max(0, picoHue - 55)
  const hMax = Math.min(360, picoHue + 55)

  return { hMin, hMax, sMin, vMin, modo, picoHue }
}

// ---------- morfologia via imagem integral (rápida p/ qualquer raio) ----------

function buildIntegral(mask: Uint8Array, w: number, h: number): Int32Array {
  const integral = new Int32Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      rowSum += mask[y * w + x]
      integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum
    }
  }
  return integral
}

function windowSum(integral: Int32Array, w: number, h: number, x: number, y: number, r: number) {
  const x0 = Math.max(0, x - r)
  const y0 = Math.max(0, y - r)
  const x1 = Math.min(w - 1, x + r)
  const y1 = Math.min(h - 1, y + r)
  const A = integral[y0 * (w + 1) + x0]
  const B = integral[y0 * (w + 1) + (x1 + 1)]
  const C = integral[(y1 + 1) * (w + 1) + x0]
  const D = integral[(y1 + 1) * (w + 1) + (x1 + 1)]
  return { sum: D - B - C + A, area: (x1 - x0 + 1) * (y1 - y0 + 1) }
}

export function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const integral = buildIntegral(mask, w, h)
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const { sum } = windowSum(integral, w, h, x, y, r)
      out[y * w + x] = sum > 0 ? 1 : 0
    }
  return out
}

export function erode(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const integral = buildIntegral(mask, w, h)
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const { sum, area } = windowSum(integral, w, h, x, y, r)
      out[y * w + x] = sum === area ? 1 : 0
    }
  return out
}

export function morphClose(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  return erode(dilate(mask, w, h, r), w, h, r)
}

export function morphOpen(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  return dilate(erode(mask, w, h, r), w, h, r)
}

// ---------- componentes conectados (4-conexo, iterativo) ----------

export function labelComponents(mask: Uint8Array, w: number, h: number): { labels: Int32Array; comps: ComponenteConectado[] } {
  const labels = new Int32Array(w * h).fill(-1)
  const stack = new Int32Array(w * h)
  const comps: ComponenteConectado[] = []
  let curLabel = 0
  for (let start = 0; start < w * h; start++) {
    if (mask[start] !== 1 || labels[start] !== -1) continue
    let sp = 0
    stack[sp++] = start
    labels[start] = curLabel
    let count = 0
    let minX = w
    let maxX = 0
    let minY = h
    let maxY = 0
    while (sp > 0) {
      const idx = stack[--sp]
      const x = idx % w
      const y = (idx / w) | 0
      count++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (x > 0) {
        const n = idx - 1
        if (mask[n] === 1 && labels[n] === -1) {
          labels[n] = curLabel
          stack[sp++] = n
        }
      }
      if (x < w - 1) {
        const n = idx + 1
        if (mask[n] === 1 && labels[n] === -1) {
          labels[n] = curLabel
          stack[sp++] = n
        }
      }
      if (y > 0) {
        const n = idx - w
        if (mask[n] === 1 && labels[n] === -1) {
          labels[n] = curLabel
          stack[sp++] = n
        }
      }
      if (y < h - 1) {
        const n = idx + w
        if (mask[n] === 1 && labels[n] === -1) {
          labels[n] = curLabel
          stack[sp++] = n
        }
      }
    }
    comps.push({ label: curLabel, count, minX, maxX, minY, maxY })
    curLabel++
  }
  return { labels, comps }
}

// ---------- retângulo orientado via PCA (aprox. do "min area rect") ----------

export function orientedRect(points: Float32Array): RetanguloOrientado {
  const n = points.length / 2
  let sumX = 0
  let sumY = 0
  for (let i = 0; i < n; i++) {
    sumX += points[i * 2]
    sumY += points[i * 2 + 1]
  }
  const meanX = sumX / n
  const meanY = sumY / n
  let cxx = 0
  let cxy = 0
  let cyy = 0
  for (let i = 0; i < n; i++) {
    const dx = points[i * 2] - meanX
    const dy = points[i * 2 + 1] - meanY
    cxx += dx * dx
    cxy += dx * dy
    cyy += dy * dy
  }
  cxx /= n
  cxy /= n
  cyy /= n
  const theta = 0.5 * Math.atan2(2 * cxy, cxx - cyy)
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  let minU = Infinity
  let maxU = -Infinity
  let minV = Infinity
  let maxV = -Infinity
  for (let i = 0; i < n; i++) {
    const dx = points[i * 2] - meanX
    const dy = points[i * 2 + 1] - meanY
    const u = dx * cos + dy * sin
    const v = -dx * sin + dy * cos
    if (u < minU) minU = u
    if (u > maxU) maxU = u
    if (v < minV) minV = v
    if (v > maxV) maxV = v
  }
  // +1: cada "ponto" aqui é o centro de um pixel que ocupa uma área 1x1 —
  // sem esse ajuste, largura/comprimento saem sistematicamente ~1px menores
  // que o tamanho físico real.
  const wRect = maxU - minU + 1
  const hRect = maxV - minV + 1
  const corners: [number, number][] = (
    [
      [minU - 0.5, minV - 0.5],
      [maxU + 0.5, minV - 0.5],
      [maxU + 0.5, maxV + 0.5],
      [minU - 0.5, maxV + 0.5],
    ] as [number, number][]
  ).map(([u, v]) => {
    const dx = u * cos - v * sin
    const dy = u * sin + v * cos
    return [meanX + dx, meanY + dy] as [number, number]
  })
  return { widthPx: wRect, heightPx: hRect, angleDeg: (theta * 180) / Math.PI, corners, meanX, meanY, theta, minU, minV }
}

// ---------- contorno vetorial (rastreia a borda exata do pixel-mask) ----------

export function traceContour(mask: Uint8Array, w: number, h: number): [number, number][] {
  const at = (x: number, y: number) => (x < 0 || x >= w || y < 0 || y >= h ? 0 : mask[y * w + x])
  const key = (x: number, y: number) => x * (h + 1) + y
  const adj = new Map<number, number[]>()
  function addEdge(x1: number, y1: number, x2: number, y2: number) {
    const k1 = key(x1, y1)
    const k2 = key(x2, y2)
    if (!adj.has(k1)) adj.set(k1, [])
    if (!adj.has(k2)) adj.set(k2, [])
    adj.get(k1)!.push(k2)
    adj.get(k2)!.push(k1)
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue
      if (!at(x - 1, y)) addEdge(x, y, x, y + 1)
      if (!at(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1)
      if (!at(x, y - 1)) addEdge(x, y, x + 1, y)
      if (!at(x, y + 1)) addEdge(x, y + 1, x + 1, y + 1)
    }
  }
  const edgeKey = (a: number, b: number) => (a < b ? a + '_' + b : b + '_' + a)
  const visited = new Set<string>()
  const loops: number[][] = []
  for (const [startK, neighbors] of adj) {
    for (const n0 of neighbors) {
      const ek = edgeKey(startK, n0)
      if (visited.has(ek)) continue
      const loop = [startK]
      let cur = n0
      visited.add(ek)
      let steps = 0
      while (cur !== startK && steps < 2000000) {
        loop.push(cur)
        let next: number | null = null
        for (const cand of adj.get(cur)!) {
          const ek2 = edgeKey(cur, cand)
          if (!visited.has(ek2)) {
            next = cand
            break
          }
        }
        if (next === null) break
        visited.add(edgeKey(cur, next))
        cur = next
        steps++
      }
      if (loop.length > 3) loops.push(loop)
    }
  }
  const decode = (k: number): [number, number] => {
    const yv = k % (h + 1)
    const xv = (k - yv) / (h + 1)
    return [xv, yv]
  }
  let melhor: [number, number][] | null = null
  let melhorArea = -1
  for (const loop of loops) {
    const pts = loop.map(decode)
    let minx = Infinity
    let maxx = -Infinity
    let miny = Infinity
    let maxy = -Infinity
    for (const [x, y] of pts) {
      if (x < minx) minx = x
      if (x > maxx) maxx = x
      if (y < miny) miny = y
      if (y > maxy) maxy = y
    }
    const area = (maxx - minx) * (maxy - miny)
    if (area > melhorArea) {
      melhorArea = area
      melhor = pts
    }
  }
  return melhor || []
}

function distPontoLinha(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

export function douglasPeucker(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length < 3) return points.slice()
  let maxDist = 0
  let idx = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = distPontoLinha(points[i], points[0], points[points.length - 1])
    if (d > maxDist) {
      maxDist = d
      idx = i
    }
  }
  if (maxDist > epsilon) {
    const esquerda = douglasPeucker(points.slice(0, idx + 1), epsilon)
    const direita = douglasPeucker(points.slice(idx), epsilon)
    return esquerda.slice(0, -1).concat(direita)
  }
  return [points[0], points[points.length - 1]]
}

// Constrói o contorno final em mm (alinhado, mesma orientação do desenho
// técnico), simplificado — usado tanto pro desenho quanto pro DXF.
export function construirContornoMm(
  chapaBinMask: Uint8Array,
  subW: number,
  subH: number,
  roiMinX: number,
  roiMinY: number,
  rectInfo: RetanguloOrientado,
  pxPorMm: number
): [number, number][] {
  const loopPx = traceContour(chapaBinMask, subW, subH)
  if (loopPx.length === 0) return []
  const cos = Math.cos(rectInfo.theta)
  const sin = Math.sin(rectInfo.theta)
  const minUmm = rectInfo.minU / pxPorMm
  const minVmm = rectInfo.minV / pxPorMm
  const loopMm: [number, number][] = loopPx.map(([lx, ly]) => {
    const gx = roiMinX + lx
    const gy = roiMinY + ly
    const dx = gx - rectInfo.meanX
    const dy = gy - rectInfo.meanY
    const uMm = (dx * cos + dy * sin) / pxPorMm - minUmm
    const vMm = (-dx * sin + dy * cos) / pxPorMm - minVmm
    return [uMm, vMm]
  })
  loopMm.push(loopMm[0])
  return douglasPeucker(loopMm, 0.15)
}

// ---------- desenho técnico: silhueta "endireitada" da peça + cotas ----------

export function construirDesenhoTecnico(
  points: Float32Array,
  rectInfo: RetanguloOrientado,
  pxPorMm: number,
  larguraMm: number,
  comprimentoMm: number
): string {
  const cos = Math.cos(rectInfo.theta)
  const sin = Math.sin(rectInfo.theta)
  const drawScale = Math.min(8, 650 / Math.max(comprimentoMm, 1))
  const destW = Math.max(30, Math.round(comprimentoMm * drawScale))
  const destH = Math.max(30, Math.round(larguraMm * drawScale))
  const pad = 56

  const minUmm = rectInfo.minU / pxPorMm
  const minVmm = rectInfo.minV / pxPorMm

  const destMask = new Uint8Array(destW * destH)
  const n = points.length / 2
  for (let i = 0; i < n; i++) {
    const dx = points[i * 2] - rectInfo.meanX
    const dy = points[i * 2 + 1] - rectInfo.meanY
    const uMm = (dx * cos + dy * sin) / pxPorMm - minUmm
    const vMm = (-dx * sin + dy * cos) / pxPorMm - minVmm
    const gx = Math.round(uMm * drawScale)
    const gy = Math.round(vMm * drawScale)
    if (gx >= 0 && gx < destW && gy >= 0 && gy < destH) destMask[gy * destW + gx] = 1
  }
  const filled = dilate(destMask, destW, destH, 1)

  const canvas = document.createElement('canvas')
  canvas.width = destW + pad * 2
  canvas.height = destH + pad * 2 + 10
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const imgData = ctx.createImageData(destW, destH)
  for (let p = 0; p < destW * destH; p++) {
    const on = filled[p] === 1
    imgData.data[p * 4] = on ? 45 : 255
    imgData.data[p * 4 + 1] = on ? 52 : 255
    imgData.data[p * 4 + 2] = on ? 58 : 255
    imgData.data[p * 4 + 3] = 255
  }
  const tmp = document.createElement('canvas')
  tmp.width = destW
  tmp.height = destH
  tmp.getContext('2d')!.putImageData(imgData, 0, 0)
  ctx.drawImage(tmp, pad, pad)
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1
  ctx.strokeRect(pad, pad, destW, destH)

  const yCota = pad + destH + 26
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad, yCota)
  ctx.lineTo(pad + destW, yCota)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(pad, pad + destH + 4)
  ctx.lineTo(pad, yCota + 4)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(pad + destW, pad + destH + 4)
  ctx.lineTo(pad + destW, yCota + 4)
  ctx.stroke()
  ctx.fillStyle = '#111'
  ctx.font = '13px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(comprimentoMm.toFixed(1) + ' mm', pad + destW / 2, yCota + 18)

  const xCota = pad + destW + 26
  ctx.beginPath()
  ctx.moveTo(xCota, pad)
  ctx.lineTo(xCota, pad + destH)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(pad + destW + 4, pad)
  ctx.lineTo(xCota + 4, pad)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(pad + destW + 4, pad + destH)
  ctx.lineTo(xCota + 4, pad + destH)
  ctx.stroke()
  ctx.save()
  ctx.translate(xCota + 18, pad + destH / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.fillText(larguraMm.toFixed(1) + ' mm', 0, 0)
  ctx.restore()

  return canvas.toDataURL('image/png')
}
