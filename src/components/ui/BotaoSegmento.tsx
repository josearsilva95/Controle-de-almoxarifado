export type TamanhoSegmento = 'normal' | 'compacto'

const TAMANHOS: Record<TamanhoSegmento, string> = {
  normal: 'px-3 py-2 text-sm font-medium',
  compacto: 'px-2 py-2.5 text-xs font-semibold',
}

const BASE =
  'flex-1 rounded-md border-2 text-center transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

// Botão de segmento "neutro" (papel, depósito): fundo/borda mudam com a seleção.
export function classesBotaoSegmento(ativo: boolean, tamanho: TamanhoSegmento = 'normal'): string {
  return `${BASE} ${TAMANHOS[tamanho]} ${
    ativo
      ? 'border-primary bg-primary/10 text-primary shadow-sm'
      : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
  }`
}

// Botão de segmento "colorido" (urgência): a cor de fundo já vem via style inline,
// então a seleção é indicada só por borda + anel, sem sobrepor o fundo.
export function classesBotaoSegmentoCor(ativo: boolean): string {
  return `${BASE} px-2 py-2.5 text-xs font-semibold text-foreground ${
    ativo ? 'border-primary ring-2 ring-ring/30 shadow-sm' : 'border-border hover:border-primary/40'
  }`
}
