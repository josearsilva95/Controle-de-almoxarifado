import { ClipboardCheck } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useEstoqueCiclosContext } from '../hooks/useEstoqueCiclosContext'
import { marcarCicloVisto } from '../lib/acoesEstoque'
import { gerarPdfCicloContagem } from '../lib/inventarioPdf'

// Card flutuante, mesmo estilo do alerta de empilhadeira, mas clicável —
// aparece só pra quem tem profiles.recebe_alerta_ciclo = true quando a
// contagem cíclica do dia é concluída. Clicar baixa o PDF do resultado e
// marca como visto (some da tela).
export function AlertaContagemCiclica() {
  const { profile } = useAuth()
  const { ciclo, itens } = useEstoqueCiclosContext()

  if (!profile || !ciclo || !ciclo.finalizado_em || ciclo.visto_em) return null

  async function baixarEDispensar() {
    if (!ciclo || !profile) return
    gerarPdfCicloContagem(ciclo, itens)
    await marcarCicloVisto(ciclo.id, profile.id)
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-72">
      <button
        type="button"
        onClick={baixarEDispensar}
        className="pointer-events-auto flex items-start gap-3 rounded-lg border border-primary/30 bg-card p-3 text-left shadow-lg transition-colors hover:bg-muted"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ClipboardCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-card-foreground">Contagem cíclica concluída</p>
          <p className="text-xs text-muted-foreground">Toque pra baixar o PDF com os 10 itens de hoje.</p>
        </div>
      </button>
    </div>
  )
}
