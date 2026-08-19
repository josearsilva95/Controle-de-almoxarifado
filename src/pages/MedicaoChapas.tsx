import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Camera, Download, Ruler, Search, Sliders, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'
import { CapturaFotoChapa } from '../components/CapturaFotoChapa'
import { Cartao } from '../components/ui/Cartao'
import { Botao, classesBotaoIcone } from '../components/ui/Botao'
import { classesBotaoSegmento } from '../components/ui/BotaoSegmento'
import { useRetalhos } from '../hooks/useRetalhos'
import { criarRetalho, excluirRetalho } from '../lib/acoesRetalhos'
import { MATERIAIS_CHAPA } from '../lib/materiaisChapa'
import { gerarPdfChapa } from '../lib/chapaPdf'
import { baixarDXF } from '../lib/chapaDxf'
import {
  calcularPesoChapa,
  construirNomeArquivo,
  desenharOverlayGabarito,
  desenharPreviewMascara,
  desenharResultado,
  gerarCodigoChapa,
  localizarGabarito,
  montarResultado,
  processarChapa,
} from '../lib/chapaMedicao'
import type { FormaChapa, GabaritoLocalizado, ResultadoMedicaoChapa } from '../lib/chapaMedicao'
import { computeBlueMask, autoCalibrarFundo } from '../lib/chapaVisao'
import type { Thresholds } from '../lib/chapaVisao'
import type { Retalho } from '../types/database'

type Modo = 'medir' | 'estoque'
type ModoEscala = 'gabarito' | 'manual'

const MAX_DIM = 1600
const inputClasse =
  'rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring'
const selectClasse = inputClasse

function CampoSlider({
  label,
  valor,
  min,
  max,
  onChange,
}: {
  label: string
  valor: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-2.5 flex items-center gap-3">
      <label className="w-28 shrink-0 font-mono text-xs text-muted-foreground">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={valor}
        onChange={(e) => onChange(+e.target.value)}
        className="flex-1 accent-primary"
      />
      <span className="w-9 shrink-0 text-right font-mono text-xs text-card-foreground">{valor}</span>
    </div>
  )
}

function Status({ msg, tipo }: { msg: string; tipo: 'ok' | 'err' | 'info' }) {
  const cores = {
    ok: 'bg-green-500/10 text-green-600 border-green-500/30',
    err: 'bg-destructive/10 text-destructive border-destructive/30',
    info: 'bg-muted text-muted-foreground border-border',
  }
  return <div className={`mt-3 rounded-md border px-3 py-2 font-mono text-xs ${cores[tipo]}`}>{msg}</div>
}

export function MedicaoChapas() {
  const { profile } = useAuth()
  const { retalhos, recarregar: recarregarRetalhos } = useRetalhos()
  const [modo, setModo] = useState<Modo>('medir')

  // ---- imagem carregada ----
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [imgW, setImgW] = useState(0)
  const [imgH, setImgH] = useState(0)
  const [temFoto, setTemFoto] = useState(false)
  const [escaneando, setEscaneando] = useState(false)

  // ---- código, peça, peso ----
  const [codigoPeca, setCodigoPeca] = useState('')
  const [shapeMode, setShapeMode] = useState<FormaChapa>('irregular')
  const [calcularPeso, setCalcularPeso] = useState(false)
  const [espessura, setEspessura] = useState('3')
  const [materialSlug, setMaterialSlug] = useState(MATERIAIS_CHAPA[0].slug)
  const [densidadeCustom, setDensidadeCustom] = useState('7.85')

  // ---- escala ----
  const [modoEscala, setModoEscala] = useState<ModoEscala>('gabarito')
  const [gabValue, setGabValue] = useState('100')
  const [gabUnit, setGabUnit] = useState<'mm' | 'cm'>('mm')
  const [refWidthCm, setRefWidthCm] = useState('30')
  const [wSMax, setWSMax] = useState(20)
  const [wVMin, setWVMin] = useState(65)
  const [calibracao, setCalibracao] = useState<GabaritoLocalizado | null>(null)
  const [gabStatus, setGabStatus] = useState<{ msg: string; tipo: 'ok' | 'err' | 'info' } | null>(null)

  // ---- cor de fundo ----
  const [hMin, setHMin] = useState(160)
  const [hMax, setHMax] = useState(290)
  const [sMin, setSMin] = useState(40)
  const [vMin, setVMin] = useState(18)
  const [satMinPeca, setSatMinPeca] = useState('0')
  const [aparoBorda, setAparoBorda] = useState('1')

  // ---- processamento ----
  const [status, setStatus] = useState<{ msg: string; tipo: 'ok' | 'err' | 'info' }>({
    msg: 'Envie uma foto para começar.',
    tipo: 'info',
  })
  const [processando, setProcessando] = useState(false)
  const [resultado, setResultado] = useState<{
    linha1: { lbl: string; val: string }
    linha2: { lbl: string; val: string }
    areaMm2: string
    pesoKg: string | null
    detalhes: string
  } | null>(null)
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoMedicaoChapa | null>(null)
  const [salvando, setSalvando] = useState(false)

  // ---- busca no estoque ----
  const [buscaMaterial, setBuscaMaterial] = useState('')
  const [buscaEspessura, setBuscaEspessura] = useState('')
  const [buscaDim1, setBuscaDim1] = useState('')
  const [buscaDim2, setBuscaDim2] = useState('')
  const [resultadoBusca, setResultadoBusca] = useState<{ p: Retalho; sobra: number }[] | 'sem-filtro' | 'sem-resultado' | null>(null)

  const thresholds: Thresholds = { hMin, hMax, sMin, vMin }

  function getImageData() {
    const canvas = baseCanvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')!.getImageData(0, 0, imgW, imgH)
  }

  function carregarImagem(img: HTMLImageElement) {
    let w = img.width
    let h = img.height
    const scale = Math.min(1, MAX_DIM / Math.max(w, h))
    w = Math.round(w * scale)
    h = Math.round(h * scale)
    setImgW(w)
    setImgH(h)

    const base = document.createElement('canvas')
    base.width = w
    base.height = h
    base.getContext('2d')!.drawImage(img, 0, 0, w, h)
    baseCanvasRef.current = base

    const display = displayCanvasRef.current
    if (display) {
      display.width = w
      display.height = h
      display.getContext('2d')!.drawImage(base, 0, 0)
    }

    setTemFoto(true)
    setCalibracao(null)
    setGabStatus({ msg: 'Clique em "Localizar gabarito branco".', tipo: 'info' })
    setStatus({ msg: `Foto carregada (${w}×${h}px). Calibre a escala e clique em "Medir chapa".`, tipo: 'info' })
    setResultado(null)
    setUltimoResultado(null)
  }

  function aoCapturarFoto(img: HTMLImageElement) {
    setEscaneando(false)
    carregarImagem(img)
  }

  // ---- gabarito ----
  function tentarLocalizarGabarito(): GabaritoLocalizado | null {
    const imgData = getImageData()
    if (!imgData) return null
    const gabValueCm = gabUnit === 'mm' ? +gabValue / 10 : +gabValue
    const gab = localizarGabarito(imgData, imgW, imgH, gabValueCm, wSMax, wVMin)
    if (!gab) return null
    setCalibracao(gab)
    const display = displayCanvasRef.current
    const base = baseCanvasRef.current
    if (display && base) desenharOverlayGabarito(display, base, gab, +gabValue, gabUnit)
    const bw = gab.bbox.maxX - gab.bbox.minX + 1
    const bh = gab.bbox.maxY - gab.bbox.minY + 1
    setGabStatus({ msg: `Gabarito localizado: ${bw}×${bh} px — escala de ${gab.pxPorCm.toFixed(2)} px/cm.`, tipo: 'ok' })
    return gab
  }

  function handleLocalizarGabarito() {
    if (!temFoto) {
      setGabStatus({ msg: 'Envie uma foto primeiro.', tipo: 'err' })
      return
    }
    setGabStatus({ msg: 'Procurando…', tipo: 'info' })
    setTimeout(() => {
      const achou = tentarLocalizarGabarito()
      if (!achou) {
        setGabStatus({
          msg: 'Não encontrei um gabarito branco e quadrado na foto. Ajuste os sliders de detecção do branco.',
          tipo: 'err',
        })
      }
    }, 20)
  }

  // ---- cor de fundo ----
  function handleAutoCalibrar() {
    if (!temFoto) {
      setStatus({ msg: 'Envie uma foto primeiro.', tipo: 'err' })
      return
    }
    setStatus({ msg: 'Analisando cores da foto…', tipo: 'info' })
    setTimeout(() => {
      const imgData = getImageData()
      if (!imgData) return
      const r = autoCalibrarFundo(imgData, imgW, imgH)
      if (!r) {
        setStatus({
          msg: 'Não consegui reconhecer um fundo azul nessa foto pra calibrar automaticamente. Ajuste os sliders na mão.',
          tipo: 'err',
        })
        return
      }
      setHMin(Math.round(r.hMin))
      setHMax(Math.round(r.hMax))
      setSMin(Math.round(r.sMin))
      setVMin(Math.round(r.vMin))
      setTimeout(() => handlePreviewMask({ hMin: Math.round(r.hMin), hMax: Math.round(r.hMax), sMin: Math.round(r.sMin), vMin: Math.round(r.vMin) }), 0)
      setStatus({
        msg: `Calibrado: ${r.modo} — matiz do fundo ~${Math.round(r.picoHue)}°. Área amarela na foto = o que foi reconhecido como fundo azul.`,
        tipo: 'ok',
      })
    }, 30)
  }

  function handlePreviewMask(th?: Thresholds) {
    if (!temFoto) {
      setStatus({ msg: 'Envie uma foto primeiro.', tipo: 'err' })
      return
    }
    const imgData = getImageData()
    const display = displayCanvasRef.current
    const base = baseCanvasRef.current
    if (!imgData || !display || !base) return
    const mask = computeBlueMask(imgData, imgW, imgH, th ?? thresholds)
    desenharPreviewMascara(display, base, imgW, imgH, mask)
    setStatus({
      msg: 'Pré-visualização: área amarela = o que está sendo lido como "fundo azul". Ajuste os sliders até cobrir bem o fundo, sem pegar a chapa.',
      tipo: 'info',
    })
  }

  // ---- processar ----
  function handleProcessar() {
    if (!temFoto) {
      setStatus({ msg: 'Envie uma foto primeiro.', tipo: 'err' })
      return
    }
    const refWidthCmNum = +refWidthCm || null
    if (modoEscala === 'manual' && (!refWidthCmNum || refWidthCmNum <= 0)) {
      setStatus({ msg: 'Informe a largura real da placa azul em cm.', tipo: 'err' })
      return
    }
    setProcessando(true)
    setStatus({ msg: 'Processando…', tipo: 'info' })

    setTimeout(() => {
      try {
        let calibracaoAtual = calibracao
        if (modoEscala === 'gabarito' && !calibracaoAtual) {
          calibracaoAtual = tentarLocalizarGabarito()
          if (!calibracaoAtual) {
            setStatus({
              msg: 'Não encontrei o gabarito branco na foto. Ajuste os sliders de detecção do branco (aba Escala) e tente de novo — a medição não continua sem ele.',
              tipo: 'err',
            })
            setProcessando(false)
            return
          }
        }

        const imgData = getImageData()
        if (!imgData) {
          setProcessando(false)
          return
        }

        const proc = processarChapa({
          imgData,
          imgW,
          imgH,
          thresholds,
          modo: modoEscala,
          calibracao: calibracaoAtual,
          refWidthCm: refWidthCmNum,
          satMinPeca: +satMinPeca || 0,
          aparoBordaMm: +aparoBorda || 0,
        })

        if ('erro' in proc) {
          setStatus({ msg: proc.erro, tipo: 'err' })
          setProcessando(false)
          return
        }

        const larguraMm = proc.larguraMm
        const comprimentoMm = proc.comprimentoMm
        const diametroAreaMm = shapeMode === 'circular' ? 2 * Math.sqrt(proc.areaMm2 / Math.PI) : null

        const espessuraMm = +espessura || null
        const densidade = calcularPeso ? (materialSlug === 'outro' ? +densidadeCustom : MATERIAIS_CHAPA.find((m) => m.slug === materialSlug)?.densidade ?? null) : null
        const pesoKg = calcularPeso && espessuraMm && densidade ? calcularPesoChapa(proc.areaMm2, espessuraMm, densidade) : null

        // desenha resultado
        const display = displayCanvasRef.current
        const base = baseCanvasRef.current
        if (display && base) {
          const label = shapeMode === 'circular' ? `⌀ ${diametroAreaMm!.toFixed(0)} mm` : `${larguraMm.toFixed(0)} x ${comprimentoMm.toFixed(0)} mm`
          desenharResultado(display, base, imgW, imgH, proc, modoEscala === 'gabarito' ? calibracaoAtual?.bbox ?? null : null, label)
        }

        setResultado({
          linha1:
            shapeMode === 'circular'
              ? { lbl: 'Diâmetro (área real)', val: diametroAreaMm!.toFixed(1) }
              : { lbl: 'Largura', val: larguraMm.toFixed(1) },
          linha2:
            shapeMode === 'circular'
              ? { lbl: 'Diâmetro (retângulo)', val: ((larguraMm + comprimentoMm) / 2).toFixed(1) }
              : { lbl: 'Comprimento', val: comprimentoMm.toFixed(1) },
          areaMm2: proc.areaMm2.toFixed(0),
          pesoKg: pesoKg != null ? pesoKg.toFixed(2) : null,
          detalhes:
            `placa (bbox): ${proc.plateW} x ${proc.plateH} px\n` +
            `escala: ${proc.pxPorMm.toFixed(3)} px/mm\n` +
            `chapa (retângulo orientado): ${larguraMm.toFixed(1)} x ${comprimentoMm.toFixed(1)} mm\n` +
            `ângulo: ${proc.rect.angleDeg.toFixed(1)}°\n` +
            `área real (contorno): ${proc.areaMm2.toFixed(0)} mm²\n` +
            `área do retângulo envolvente: ${proc.areaEnvelopeMm2.toFixed(0)} mm²\n` +
            `aproveitamento: ${proc.aproveitamento.toFixed(1)}%` +
            (pesoKg != null ? `\nespessura: ${espessuraMm} mm\ndensidade: ${densidade} g/cm³\npeso: ${pesoKg.toFixed(3)} kg` : ''),
        })

        const materialInfo = MATERIAIS_CHAPA.find((m) => m.slug === materialSlug)
        const materialLabel = calcularPeso ? (materialSlug === 'outro' ? 'Outro material' : materialInfo?.label ?? null) : null
        const materialSlugFinal = calcularPeso ? materialSlug : 'Peca'
        const metodoEscala =
          modoEscala === 'gabarito' ? `Gabarito branco (${gabValue}${gabUnit})` : `Placa azul (largura informada: ${refWidthCm} cm)`

        let codigoFinal = codigoPeca.trim()
        if (!codigoFinal && espessuraMm) {
          codigoFinal = gerarCodigoChapa(retalhos, espessuraMm)
          setCodigoPeca(codigoFinal)
        }

        const imagemDataUrl = display ? display.toDataURL('image/jpeg', 0.85) : ''

        const resultadoCompleto = montarResultado({
          proc,
          shapeMode,
          imagemDataUrl,
          codigoPeca: codigoFinal,
          metodoEscala,
          calcularPeso,
          espessuraMm,
          densidade,
          materialLabel,
          materialSlug: materialSlugFinal,
        })
        setUltimoResultado(resultadoCompleto)

        setStatus({ msg: 'Medição concluída.', tipo: 'ok' })
      } catch (err) {
        console.error(err)
        setStatus({ msg: `Erro ao processar: ${err instanceof Error ? err.message : String(err)}`, tipo: 'err' })
      }
      setProcessando(false)
    }, 30)
  }

  // ---- salvar (PDF + DXF + registra no estoque) ----
  async function handleSalvar() {
    if (!ultimoResultado || !profile) return
    const r = ultimoResultado
    const nomeArquivo = construirNomeArquivo(r)
    setSalvando(true)

    if (r.codigoPeca) {
      const { erro } = await criarRetalho({
        codigo: r.codigoPeca,
        materialSlug: r.materialSlug,
        materialLabel: r.materialLabel,
        espessuraMm: r.espessuraMm,
        shapeMode: r.shapeMode,
        dim1Mm: r.shapeMode === 'circular' ? r.diametroAreaMm : r.larguraMm,
        dim2Mm: r.shapeMode === 'circular' ? null : r.comprimentoMm,
        areaMm2: r.areaMm2,
        pesoKg: r.pesoKg,
        usuarioId: profile.id,
      })
      if (erro) {
        window.alert(`Medição salva em PDF/DXF, mas não consegui registrar no estoque: ${erro}`)
      } else {
        recarregarRetalhos()
      }
    }

    // No celular, dois downloads disparados no mesmo instante costumam
    // fazer o navegador silenciosamente ignorar o segundo — um intervalo
    // pequeno entre os dois resolve isso na maioria dos aparelhos.
    if (r.contornoMm.length >= 3) baixarDXF(r.contornoMm, nomeArquivo)
    setTimeout(() => gerarPdfChapa(r, nomeArquivo), 400)
    setSalvando(false)
  }

  // ---- busca de retalho que sirva ----
  function handleBuscar() {
    const d1 = +buscaDim1
    const d2 = +buscaDim2
    if (!buscaMaterial || !buscaEspessura) {
      setResultadoBusca('sem-filtro')
      return
    }
    if (!d1 || !d2) {
      setResultadoBusca('sem-filtro')
      return
    }
    const candidatos = retalhos.filter(
      (p) => p.material_slug === buscaMaterial && p.espessura_mm === +buscaEspessura && p.shape_mode !== 'circular' && p.dim1_mm != null && p.dim2_mm != null
    )
    const cabem = candidatos
      .map((p) => {
        const pMin = Math.min(p.dim1_mm!, p.dim2_mm!)
        const pMax = Math.max(p.dim1_mm!, p.dim2_mm!)
        const cabe = pMin >= Math.min(d1, d2) && pMax >= Math.max(d1, d2)
        const sobra = p.dim1_mm! * p.dim2_mm! - d1 * d2
        return { p, cabe, sobra }
      })
      .filter((c) => c.cabe)
      .sort((a, b) => a.sobra - b.sobra)
      .slice(0, 5)
    setResultadoBusca(cabem.length > 0 ? cabem : 'sem-resultado')
  }

  const materiaisDisponiveis = useMemo(
    () => [...new Set(retalhos.map((r) => r.material_slug).filter((v): v is string => Boolean(v)))].sort(),
    [retalhos]
  )
  const espessurasDisponiveis = useMemo(
    () => [...new Set(retalhos.map((r) => r.espessura_mm).filter((v): v is number => v != null))].sort((a, b) => a - b),
    [retalhos]
  )
  const pesoTotal = useMemo(() => retalhos.reduce((s, p) => s + (p.peso_kg ?? 0), 0), [retalhos])

  async function handleExcluirRetalho(r: Retalho) {
    if (!window.confirm(`Excluir o retalho "${r.codigo}"?`)) return
    const { erro } = await excluirRetalho(r.id)
    if (erro) window.alert(`Não foi possível excluir: ${erro}`)
  }

  function handleUploadImagem(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => carregarImagem(img)
    img.src = URL.createObjectURL(file)
  }

  if (!profile) return null

  return (
    <AppShell>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-foreground">Medição de Chapas</h2>
        <p className="text-sm text-muted-foreground">
          Fotografe um retalho sobre fundo azul pra medir automaticamente e gerenciar o estoque de sobras.
        </p>
      </div>

      <div className="mb-5 inline-flex rounded-md border border-border bg-card p-1">
        {(
          [
            ['medir', 'Medir peça'],
            ['estoque', 'Estoque de retalhos'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              modo === valor ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-card-foreground'
            }`}
            onClick={() => setModo(valor)}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {modo === 'medir' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
          <div className="space-y-4">
            <Cartao>
              <h3 className="mb-3 text-sm font-semibold text-card-foreground">1. Foto</h3>
              <div className="flex gap-2">
                <Botao type="button" variante="secundaria" className="flex-1" onClick={() => setEscaneando(true)}>
                  <Camera className="h-4 w-4" />
                  Tirar foto
                </Botao>
                <label className={`${classesBotaoIcone()} border border-border`}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadImagem} />
                  <Download className="h-4 w-4 rotate-180" />
                </label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Tire a foto de cima, o mais reto possível, com o retalho inteiro sobre o fundo azul.
              </p>
            </Cartao>

            <Cartao>
              <h3 className="mb-3 text-sm font-semibold text-card-foreground">2. Peça, peso e código</h3>
              <div className="mb-3 flex gap-2">
                <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-card-foreground">
                  Código
                  <input className={inputClasse} value={codigoPeca} onChange={(e) => setCodigoPeca(e.target.value)} placeholder="gerado ao medir" />
                </label>
              </div>

              <div className="mb-3 flex gap-2">
                {(['irregular', 'circular'] as const).map((v) => (
                  <button key={v} type="button" className={classesBotaoSegmento(shapeMode === v, 'compacto')} onClick={() => setShapeMode(v)}>
                    {v === 'irregular' ? 'Retangular / irregular' : 'Circular (diâmetro)'}
                  </button>
                ))}
              </div>

              <label className="mb-3 flex items-center gap-2 text-sm text-card-foreground">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={calcularPeso} onChange={(e) => setCalcularPeso(e.target.checked)} />
                Calcular peso estimado
              </label>

              {calcularPeso && (
                <>
                  <label className="mb-3 flex flex-col gap-1 text-xs font-medium text-card-foreground">
                    Espessura (mm)
                    <input className={inputClasse} type="number" min={0.1} step={0.1} value={espessura} onChange={(e) => setEspessura(e.target.value)} />
                  </label>
                  <label className="mb-3 flex flex-col gap-1 text-xs font-medium text-card-foreground">
                    Material
                    <select className={selectClasse} value={materialSlug} onChange={(e) => setMaterialSlug(e.target.value)}>
                      {MATERIAIS_CHAPA.map((m) => (
                        <option key={m.slug} value={m.slug}>
                          {m.label} — {m.densidade.toFixed(2)} g/cm³
                        </option>
                      ))}
                      <option value="outro">Outro (informar densidade)</option>
                    </select>
                  </label>
                  {materialSlug === 'outro' && (
                    <label className="mb-3 flex flex-col gap-1 text-xs font-medium text-card-foreground">
                      Densidade (g/cm³)
                      <input className={inputClasse} type="number" min={0.1} step={0.01} value={densidadeCustom} onChange={(e) => setDensidadeCustom(e.target.value)} />
                    </label>
                  )}
                </>
              )}
            </Cartao>

            <Cartao>
              <h3 className="mb-3 text-sm font-semibold text-card-foreground">3. Escala</h3>
              <div className="mb-3 flex gap-2">
                {(['gabarito', 'manual'] as const).map((v) => (
                  <button key={v} type="button" className={classesBotaoSegmento(modoEscala === v, 'compacto')} onClick={() => setModoEscala(v)}>
                    {v === 'gabarito' ? 'Gabarito branco' : 'Placa azul'}
                  </button>
                ))}
              </div>

              {modoEscala === 'gabarito' ? (
                <>
                  <div className="mb-2 flex gap-2">
                    <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-card-foreground">
                      Tamanho real do gabarito
                      <input className={inputClasse} type="number" min={1} step={0.1} value={gabValue} onChange={(e) => setGabValue(e.target.value)} />
                    </label>
                    <label className="flex w-20 flex-col gap-1 text-xs font-medium text-card-foreground">
                      Unidade
                      <select className={selectClasse} value={gabUnit} onChange={(e) => setGabUnit(e.target.value as 'mm' | 'cm')}>
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                      </select>
                    </label>
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    O gabarito precisa ser um objeto branco e aproximadamente quadrado no enquadramento.
                  </p>
                  <Botao type="button" variante="secundaria" tamanho="sm" disabled={!temFoto} onClick={handleLocalizarGabarito}>
                    <Search className="h-4 w-4" />
                    Localizar gabarito branco
                  </Botao>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-card-foreground">Ajuste de detecção do branco</summary>
                    <div className="mt-2">
                      <CampoSlider label="Saturação máx." valor={wSMax} min={0} max={100} onChange={setWSMax} />
                      <CampoSlider label="Brilho mín." valor={wVMin} min={0} max={100} onChange={setWVMin} />
                    </div>
                  </details>

                  {gabStatus && <Status msg={gabStatus.msg} tipo={gabStatus.tipo} />}
                </>
              ) : (
                <label className="flex flex-col gap-1 text-xs font-medium text-card-foreground">
                  Largura real da placa azul (cm)
                  <input className={inputClasse} type="number" min={1} step={0.1} value={refWidthCm} onChange={(e) => setRefWidthCm(e.target.value)} />
                  <span className="mt-1 text-xs text-muted-foreground">Meça a largura real da placa azul com uma régua/trena.</span>
                </label>
              )}
            </Cartao>

            <Cartao>
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-card-foreground">
                <Sliders className="h-4 w-4" /> 4. Ajuste de cor (azul do fundo)
              </h3>
              <CampoSlider label="Matiz mín." valor={hMin} min={0} max={360} onChange={setHMin} />
              <CampoSlider label="Matiz máx." valor={hMax} min={0} max={360} onChange={setHMax} />
              <CampoSlider label="Saturação mín." valor={sMin} min={0} max={100} onChange={setSMin} />
              <CampoSlider label="Brilho mín." valor={vMin} min={0} max={100} onChange={setVMin} />

              <Botao type="button" tamanho="sm" className="mt-2 w-full" disabled={!temFoto} onClick={handleAutoCalibrar}>
                🎯 Auto-calibrar cor de fundo
              </Botao>
              <p className="my-2 text-xs text-muted-foreground">
                Analisa a própria foto e ajusta os sliders sozinho. Faça isso primeiro — só mexa na mão se o resultado não ficar bom.
              </p>
              <Botao type="button" variante="secundaria" tamanho="sm" className="w-full" disabled={!temFoto} onClick={() => handlePreviewMask()}>
                Pré-visualizar máscara azul
              </Botao>

              <div className="mt-4 border-t border-border pt-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-card-foreground">
                  Saturação mínima da peça (%)
                  <input className={inputClasse} type="number" min={0} max={60} step={1} value={satMinPeca} onChange={(e) => setSatMinPeca(e.target.value)} />
                </label>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-card-foreground">
                  Aparar borda da peça (mm)
                  <input className={inputClasse} type="number" min={0} max={10} step={0.5} value={aparoBorda} onChange={(e) => setAparoBorda(e.target.value)} />
                </label>
              </div>
            </Cartao>

            <Cartao>
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-card-foreground">
                <Ruler className="h-4 w-4" /> 5. Processar
              </h3>
              <Botao type="button" className="w-full" disabled={!temFoto || processando} onClick={handleProcessar}>
                {processando ? 'Processando...' : 'Medir chapa'}
              </Botao>
              <Status msg={status.msg} tipo={status.tipo} />
            </Cartao>
          </div>

          <div>
            <Cartao className="flex min-h-[420px] items-center justify-center p-4 text-center">
              {temFoto ? (
                <canvas ref={displayCanvasRef} className="max-w-full rounded" />
              ) : (
                <span className="text-sm text-muted-foreground">A imagem processada aparece aqui.</span>
              )}
            </Cartao>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <i className="h-3 w-3 rounded-sm" style={{ background: '#00d4ff' }} /> Gabarito branco
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-3 w-3 rounded-sm" style={{ background: '#ffd23d' }} /> Placa azul
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-3 w-3 rounded-sm" style={{ background: '#3ddc84' }} /> Contorno
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-3 w-3 rounded-sm" style={{ background: '#ff4d4d' }} /> Retângulo mínimo
              </span>
            </div>

            <Cartao className="mt-4">
              <h3 className="mb-3 text-sm font-semibold text-card-foreground">Resultado</h3>
              {resultado ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-md bg-secondary p-3 text-center">
                      <div className="font-mono text-2xl font-bold text-primary">{resultado.linha1.val}</div>
                      <div className="text-xs text-muted-foreground">mm</div>
                      <div className="mt-1 text-xs text-secondary-foreground">{resultado.linha1.lbl}</div>
                    </div>
                    <div className="rounded-md bg-secondary p-3 text-center">
                      <div className="font-mono text-2xl font-bold text-primary">{resultado.linha2.val}</div>
                      <div className="text-xs text-muted-foreground">mm</div>
                      <div className="mt-1 text-xs text-secondary-foreground">{resultado.linha2.lbl}</div>
                    </div>
                    <div className="rounded-md bg-secondary p-3 text-center">
                      <div className="font-mono text-2xl font-bold text-primary">{resultado.areaMm2}</div>
                      <div className="text-xs text-muted-foreground">mm²</div>
                      <div className="mt-1 text-xs text-secondary-foreground">Área real</div>
                    </div>
                    {resultado.pesoKg && (
                      <div className="rounded-md bg-secondary p-3 text-center">
                        <div className="font-mono text-2xl font-bold text-primary">{resultado.pesoKg}</div>
                        <div className="text-xs text-muted-foreground">kg</div>
                        <div className="mt-1 text-xs text-secondary-foreground">Peso estimado</div>
                      </div>
                    )}
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-card-foreground">
                      Detalhes técnicos (px, escala, ângulo, aproveitamento)
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-muted-foreground">{resultado.detalhes}</pre>
                  </details>

                  <Botao type="button" className="mt-4 w-full" disabled={!ultimoResultado || salvando} onClick={handleSalvar}>
                    <Download className="h-4 w-4" />
                    {salvando ? 'Salvando...' : 'Salvar (PDF + DXF + estoque)'}
                  </Botao>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Baixa o relatório em PDF e o contorno vetorial em DXF (AutoCAD, escala 1:1), e registra a peça no estoque de retalhos.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Meça uma peça pra ver o resultado aqui.</p>
              )}
            </Cartao>
          </div>
        </div>
      )}

      {modo === 'estoque' && (
        <div className="space-y-5">
          <Cartao>
            <h3 className="mb-1 text-sm font-semibold text-card-foreground">Buscar retalho</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Filtra por material e espessura e busca peças iguais ou maiores que a medida pedida (considerando que dá pra girar 90°).
            </p>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select className={selectClasse} value={buscaMaterial} onChange={(e) => setBuscaMaterial(e.target.value)}>
                <option value="">— material —</option>
                {materiaisDisponiveis.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select className={selectClasse} value={buscaEspessura} onChange={(e) => setBuscaEspessura(e.target.value)}>
                <option value="">— espessura —</option>
                {espessurasDisponiveis.map((e) => (
                  <option key={e} value={e}>
                    {e} mm
                  </option>
                ))}
              </select>
              <input className={inputClasse} type="number" placeholder="Dimensão 1 (mm)" value={buscaDim1} onChange={(e) => setBuscaDim1(e.target.value)} />
              <input className={inputClasse} type="number" placeholder="Dimensão 2 (mm)" value={buscaDim2} onChange={(e) => setBuscaDim2(e.target.value)} />
            </div>
            <Botao type="button" tamanho="sm" onClick={handleBuscar}>
              <Search className="h-4 w-4" />
              Buscar
            </Botao>

            {resultadoBusca === 'sem-filtro' && <Status msg="Escolha material, espessura e as duas dimensões." tipo="err" />}
            {resultadoBusca === 'sem-resultado' && <Status msg="Nenhum retalho igual ou maior encontrado nesse material/espessura." tipo="err" />}
            {Array.isArray(resultadoBusca) && (
              <div className="mt-3 space-y-2">
                {resultadoBusca.map(({ p, sobra }) => (
                  <div key={p.id} className="rounded-md bg-secondary p-3">
                    <div className="font-mono font-semibold text-primary">{p.codigo}</div>
                    <div className="text-sm text-secondary-foreground">
                      {p.dim1_mm?.toFixed(0)} x {p.dim2_mm?.toFixed(0)} mm
                    </div>
                    <div className="text-xs text-muted-foreground">sobra ~{(sobra / 100).toFixed(0)} cm² de material</div>
                  </div>
                ))}
              </div>
            )}
          </Cartao>

          <Cartao>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-card-foreground">Estoque de retalhos</h3>
              <span className="font-mono text-xs text-muted-foreground">
                {retalhos.length} peça(s) · {pesoTotal.toFixed(2)} kg
              </span>
            </div>

            {retalhos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum retalho no estoque ainda.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2.5">Código</th>
                      <th className="px-3 py-2.5">Material</th>
                      <th className="px-3 py-2.5">Esp. (mm)</th>
                      <th className="px-3 py-2.5">Dimensões (mm)</th>
                      <th className="px-3 py-2.5">Peso (kg)</th>
                      <th className="px-3 py-2.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retalhos.map((r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-3 py-2.5 font-mono font-medium text-card-foreground">{r.codigo}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{r.material_label || r.material_slug || '—'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{r.espessura_mm ?? '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">
                          {r.shape_mode === 'circular' ? `⌀${r.dim1_mm?.toFixed(0)}` : `${r.dim1_mm?.toFixed(0)}x${r.dim2_mm?.toFixed(0)}`}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{r.peso_kg != null ? r.peso_kg.toFixed(2) : '—'}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end">
                            <button type="button" className={classesBotaoIcone(true)} onClick={() => handleExcluirRetalho(r)} aria-label={`Excluir ${r.codigo}`} title="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Cartao>
        </div>
      )}

      {escaneando && <CapturaFotoChapa onCapturada={aoCapturarFoto} onFechar={() => setEscaneando(false)} />}
    </AppShell>
  )
}
