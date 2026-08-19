import { useEffect, useRef, useState } from 'react'
import { Camera, Flashlight, FlashlightOff, X } from 'lucide-react'

interface CapturaFotoChapaProps {
  onCapturada: (imagem: HTMLImageElement) => void
  onFechar: () => void
}

// Câmera em tela cheia pra fotografar a chapa de cima — mesma base de
// acesso à câmera/lanterna do ScannerCodigoBarras, mas sem a parte de
// decodificar código de barras: aqui é só abrir a câmera, deixar o usuário
// enquadrar e apertar pra capturar um frame único.
export function CapturaFotoChapa({ onCapturada, onFechar }: CapturaFotoChapaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState(false)
  const [temLanterna, setTemLanterna] = useState(false)
  const [lanternaLigada, setLanternaLigada] = useState(false)

  useEffect(() => {
    async function tentarFullscreen() {
      try {
        if (containerRef.current?.requestFullscreen) await containerRef.current.requestFullscreen()
      } catch {
        // Não suportado nesse navegador/aparelho — segue sem tela cheia.
      }
    }
    tentarFullscreen()
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
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
        const track = s.getVideoTracks()[0]
        trackRef.current = track ?? null
        // @ts-expect-error torch não está no tipo padrão de MediaTrackCapabilities
        setTemLanterna(Boolean(track?.getCapabilities?.().torch))

        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play().catch(() => {})
        }
        setPronto(true)
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

  function capturar() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const img = new Image()
    img.onload = () => onCapturada(img)
    img.src = canvas.toDataURL('image/jpeg', 0.92)
    if (navigator.vibrate) navigator.vibrate(60)
  }

  function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => onCapturada(img)
    img.src = URL.createObjectURL(file)
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black">
      {erro ? (
        <div className="flex h-full items-center justify-center p-6">
          <p className="max-w-xs text-center text-sm text-white">{erro}</p>
        </div>
      ) : (
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4 pb-10">
        <h2 className="text-sm font-semibold text-white">Fotografar retalho</h2>
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

      {!erro && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="aspect-square w-[90%] max-w-md rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      )}

      {!erro && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-6 pt-12">
          <p className="text-center text-sm text-white/90">
            {pronto ? 'Enquadra o retalho inteiro sobre o fundo azul, o mais reto possível.' : 'Abrindo câmera...'}
          </p>
          <button
            type="button"
            onClick={capturar}
            disabled={!pronto}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 text-white disabled:opacity-40"
            aria-label="Capturar foto"
          >
            <Camera className="h-7 w-7" />
          </button>
          <label className="cursor-pointer text-xs text-white/70 underline">
            ou escolher uma foto já tirada
            <input type="file" accept="image/*" className="hidden" onChange={selecionarArquivo} />
          </label>
        </div>
      )}
    </div>
  )
}
