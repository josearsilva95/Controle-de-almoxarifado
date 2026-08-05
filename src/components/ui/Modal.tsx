import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { classesBotaoIcone } from './Botao'

interface ModalProps {
  titulo: string
  onFechar: () => void
  children: ReactNode
}

export function Modal({ titulo, onFechar, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-card-foreground">{titulo}</h2>
          <button
            type="button"
            className={classesBotaoIcone()}
            onClick={onFechar}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
