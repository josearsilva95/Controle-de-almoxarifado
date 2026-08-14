import type { LucideIcon } from 'lucide-react'
import { Cartao } from './Cartao'

interface KpiCardProps {
  label: string
  valor: string
  icone: LucideIcon
  cor?: string
  descricao?: string
}

export function KpiCard({ label, valor, icone: Icone, cor, descricao }: KpiCardProps) {
  return (
    <Cartao>
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${!cor ? 'bg-primary/10 text-primary' : ''}`}
        style={cor ? { backgroundColor: `${cor}1a`, color: cor } : undefined}
      >
        <Icone className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-card-foreground">{valor}</p>
      {descricao && <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>}
    </Cartao>
  )
}
