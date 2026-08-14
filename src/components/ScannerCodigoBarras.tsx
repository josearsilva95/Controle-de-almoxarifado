import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { X } from 'lucide-react'
import { classesBotaoIcone } from './ui/Botao'

interface ScannerCodigoBarrasProps {
  onLido: (codigo: string) => void
  onFechar: () => void
}

// Lê o código de barras direto da câmera (sem OCR) — nas etiquetas do
// almoxarifado o código de barras é só a versão "pra máquina ler" do mesmo
// número impresso embaixo dele, então o texto decodificado já é o código
// que buscamos em estoque_itens.codigo, sem precisar de nenhuma conversão.
export function ScannerCodigoBarras({ onLido, onFechar }: ScannerCodigoBarrasProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const leitor = new BrowserMultiFormatReader()
    let controle: { stop: () => void } | null = null
    let cancelado = false

    leitor
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (resultado, erroLeitura, ctrl) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onFechar}>
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-card-foreground">Escanear código de barras</h2>
          <button type="button" className={classesBotaoIcone()} onClick={onFechar} aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {erro ? (
          <p className="py-6 text-center text-sm text-destructive">{erro}</p>
        ) : (
          <div className="overflow-hidden rounded-md bg-black">
            <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
          </div>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">Aponte a câmera pro código de barras da etiqueta.</p>
      </div>
    </div>
  )
}
