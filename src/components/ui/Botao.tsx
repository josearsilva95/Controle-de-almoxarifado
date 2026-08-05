import type { ButtonHTMLAttributes } from 'react'

export type VarianteBotao = 'primaria' | 'secundaria' | 'destrutiva' | 'fantasma'
export type TamanhoBotao = 'sm' | 'md'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

const VARIANTES: Record<VarianteBotao, string> = {
  primaria: 'bg-primary text-primary-foreground shadow-sm hover:opacity-90 hover:shadow-md',
  secundaria: 'border border-border bg-card text-card-foreground shadow-sm hover:bg-muted hover:border-primary/30',
  destrutiva: 'border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15',
  fantasma: 'text-muted-foreground hover:bg-muted hover:text-card-foreground',
}

const TAMANHOS: Record<TamanhoBotao, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
}

export function classesBotao(variante: VarianteBotao = 'primaria', tamanho: TamanhoBotao = 'md', className = ''): string {
  return `${BASE} ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${className}`.trim()
}

export function classesBotaoIcone(destrutivo = false): string {
  return `rounded-md p-1.5 transition-all active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    destrutivo
      ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
      : 'text-muted-foreground hover:bg-muted hover:text-card-foreground'
  }`
}

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao
  tamanho?: TamanhoBotao
}

export function Botao({ variante = 'primaria', tamanho = 'md', className = '', ...props }: BotaoProps) {
  return <button className={classesBotao(variante, tamanho, className)} {...props} />
}
