import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { ChecksumException, DecodeHintType, FormatException, NotFoundException } from '@zxing/library'
import { Flashlight, FlashlightOff, X } from 'lucide-react'

interface ScannerCodigoBarrasProps {
  onLido: (codigo: string) => void
  onFechar: () => void
}

// TRY_HARDER sem restringir POSSIBLE_FORMATS — deixa o ZXing tentar
// qualquer simbologia de barra (não só as mais comuns), já que não temos
// certeza de qual o sistema de origem usa nas etiquetas.
const DICAS = new Map<DecodeHintType, unknown>([[DecodeHintType.TRY_HARDER, true]])

const INTERVALO_TENTATIVA_MS = 350

// Lê o código de barras direto da câmera (sem OCR) — nas etiquetas do
// almoxarifado o código de barras é só a versão "pra máquina ler" do mesmo
// número impresso embaixo dele, então o texto decodificado já é o código
// que buscamos em estoque_itens.codigo, sem precisar de nenhuma conversão.
//
// Decodifica tirando snapshots da câmera pra um canvas em intervalos
// curtos (em vez de depender do loop de preview do ZXing, que em vários
// aparelhos nunca focava) — automático, sem precisar apertar nada.
export function ScannerCodigoBarras({ onLido, onFechar }: ScannerCodigoBarrasProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const leitorRef = useRef(new BrowserMultiFormatReader(DICAS))
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const lidoRef = useRef(false)
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState(false)
  const [temLanterna, setTemLanterna] = useState(false)
  const [lanternaLigada, setLanternaLigada] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let intervalo: ReturnType<typeof setInterval> | null = null
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
        const track = s.getVideoTracks()[0]
        trackRef.current = track ?? null
        // @ts-expect-error torch não está no tipo padrão de MediaTrackCapabilities
        setTemLanterna(Boolean(track?.getCapabilities?.().torch))

        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play().catch(() => {})
        }
        setPronto(true)

        const canvas = canvasRef.current
        intervalo = setInterval(() => {
          const video = videoRef.current
          if (lidoRef.current || !video || video.videoWidth === 0) return
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          try {
            const resultado = leitorRef.current.decodeFromCanvas(canvas)
            if (!lidoRef.current) {
              lidoRef.current = true
              if (navigator.vibrate) navigator.vibrate(120)
              onLido(resultado.getText().trim())
            }
          } catch (e) {
            // Frame sem código legível — normal, tenta de novo no próximo intervalo.
            if (!(e instanceof NotFoundException || e instanceof ChecksumException || e instanceof FormatException)) {
              console.error('Erro inesperado ao decodificar:', e)
            }
          }
        }, INTERVALO_TENTATIVA_MS)
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
      if (intervalo) clearInterval(intervalo)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onLido])

  async function alternarLanterna() {
    const track = trackRef.current
    if (!track) return
    const ligar = !lanternaLigada
    try {
      // @ts-expect-error torch não está no tipo padrão de MediaTrackConstraintSet
      await track.applyConstraints({ advanced: [{ torch: ligar }] })
      setLanternaLigada(ligar)
    } catch {
      // Alguns navegadores expõem a capacidade mas recusam o ajuste — ignora.
    }
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
        <div className="pointer-events-auto flex items-center gap-2">
          {temLanterna && (
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
              onClick={alternarLanterna}
              aria-label={lanternaLigada ? 'Desligar lanterna' : 'Ligar lanterna'}
            >
              {lanternaLigada ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
            </button>
          )}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
            onClick={onFechar}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!erro && pronto && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative aspect-[5/2] w-[85%] max-w-md overflow-hidden rounded-xl">
            <div className="absolute inset-0 rounded-xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            <div className="absolute inset-x-0 top-0 h-0.5 animate-[varrer_1.8s_ease-in-out_infinite] bg-primary shadow-[0_0_8px_2px] shadow-primary" />
          </div>
        </div>
      )}

      {!erro && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 pt-12">
          <p className="text-center text-sm text-white/90">
            {pronto ? 'Centraliza o código de barras — a leitura é automática.' : 'Abrindo câmera...'}
          </p>
        </div>
      )}

      <style>{`
        @keyframes varrer {
          0% { top: 4%; }
          50% { top: 92%; }
          100% { top: 4%; }
        }
      `}</style>
    </div>
  )
}
