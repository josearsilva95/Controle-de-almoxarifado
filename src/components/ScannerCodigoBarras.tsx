import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, ChecksumException, DecodeHintType, FormatException, NotFoundException } from '@zxing/library'
import { Camera, X } from 'lucide-react'

interface ScannerCodigoBarrasProps {
  onLido: (codigo: string) => void
  onFechar: () => void
}

// Restringe aos formatos de barra comuns em etiqueta de almoxarifado (em vez
// de tentar todos, incluindo QR) e pede pra tentar mais — mais lento por
// frame, mas bem mais certeiro, que é o que importa numa leitura pontual.
const DICAS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
    ],
  ],
  [DecodeHintType.TRY_HARDER, true],
])

// Lê o código de barras direto da câmera (sem OCR) — nas etiquetas do
// almoxarifado o código de barras é só a versão "pra máquina ler" do mesmo
// número impresso embaixo dele, então o texto decodificado já é o código
// que buscamos em estoque_itens.codigo, sem precisar de nenhuma conversão.
//
// Em vez de só decodificar continuamente em segundo plano (que em vários
// aparelhos nunca acha nada porque o vídeo de preview vem sem foco de
// verdade), o botão "Capturar" tira uma foto parada e decodifica ela —
// isso força o navegador a focar antes de tirar a foto, bem mais confiável.
export function ScannerCodigoBarras({ onLido, onFechar }: ScannerCodigoBarrasProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const leitorRef = useRef<BrowserMultiFormatReader | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [avisoCaptura, setAvisoCaptura] = useState<string | null>(null)
  const [capturando, setCapturando] = useState(false)

  useEffect(() => {
    const leitor = new BrowserMultiFormatReader(DICAS)
    leitorRef.current = leitor
    let stream: MediaStream | null = null
    let cancelado = false

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        // @ts-expect-error focusMode não está no lib.dom.d.ts mas é suportado no Chrome/Android
        advanced: [{ focusMode: 'continuous' }],
      },
    }

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((s) => {
        if (cancelado) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play().catch(() => {})
        }
      })
      .catch((e: unknown) => {
        if (cancelado) return
        setErro(
          e instanceof Error && e.name === 'NotAllowedError'
            ? 'Permissão da câmera negada. Autoriza o acesso e tenta de novo.'
            : 'Não foi possível acessar a câmera neste dispositivo/navegador.'
        )
      })

    return () => {
      cancelado = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function capturar() {
    const video = videoRef.current
    const leitor = leitorRef.current
    if (!video || !leitor || video.videoWidth === 0) return

    setCapturando(true)
    setAvisoCaptura(null)

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setCapturando(false)
      return
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Dá um instante pro autofoco assentar antes de decodificar — o
    // getUserMedia às vezes só refoca quando percebe que o frame mudou.
    setTimeout(() => {
      try {
        const resultado = leitor.decodeFromCanvas(canvas)
        onLido(resultado.getText().trim())
      } catch (e) {
        setCapturando(false)
        const naoAchou =
          e instanceof NotFoundException || e instanceof ChecksumException || e instanceof FormatException
        setAvisoCaptura(
          naoAchou
            ? 'Não achei um código de barras nessa foto. Aproxima, centraliza e tenta de novo.'
            : 'Não consegui ler essa foto. Tenta de novo.'
        )
      }
    }, 300)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {erro ? (
        <div className="flex h-full items-center justify-center p-6">
          <p className="max-w-xs text-center text-sm text-white">{erro}</p>
        </div>
      ) : (
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4 pb-10">
        <h2 className="text-sm font-semibold text-white">Escanear código de barras</h2>
        <button
          type="button"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
          onClick={onFechar}
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {!erro && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent p-6 pt-16">
          {avisoCaptura && <p className="text-center text-sm text-white">{avisoCaptura}</p>}
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
            onClick={capturar}
            disabled={capturando}
          >
            <Camera className="h-5 w-5" />
            {capturando ? 'Lendo...' : 'Capturar'}
          </button>
          <p className="text-center text-xs text-white/80">
            Centraliza o código de barras na tela e aperta em Capturar.
          </p>
        </div>
      )}
    </div>
  )
}
