import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { X } from 'lucide-react'

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
export function ScannerCodigoBarras({ onLido, onFechar }: ScannerCodigoBarrasProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const leitor = new BrowserMultiFormatReader(DICAS)
    let controle: { stop: () => void } | null = null
    let cancelado = false

    // Pede resolução alta e foco contínuo — a câmera "padrão" do
    // getUserMedia costuma vir baixa/desfocada de perto, o que é
    // exatamente a distância em que se lê um código de barras.
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        // @ts-expect-error focusMode não está no lib.dom.d.ts mas é suportado no Chrome/Android
        advanced: [{ focusMode: 'continuous' }],
      },
    }

    leitor
      .decodeFromConstraints(constraints, videoRef.current ?? undefined, (resultado, erroLeitura, ctrl) => {
        controle = ctrl
        if (cancelado) return
        if (resultado) {
          onLido(resultado.getText().trim())
        }
        // erroLeitura dispara a cada frame sem código visível — não é uma
        // falha real, só significa "ainda não achou", então é ignorado.
        void erroLeitura
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
      controle?.stop()
    }
  }, [onLido])

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
        <>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="aspect-[3/1] w-4/5 max-w-md rounded-lg border-2 border-white/80" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 pt-10">
            <p className="text-center text-sm text-white/90">Aponte a câmera pro código de barras da etiqueta.</p>
          </div>
        </>
      )}
    </div>
  )
}
