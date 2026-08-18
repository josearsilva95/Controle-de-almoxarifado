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
        className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${!cor ? 'bg-primary/10 text-primary' : ''}`}
        style={cor ? { backgroundColor: `${cor}1a`, color: cor } : undefined}
      >
        <Icone className="h-6 w-6" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-4xl font-semibold text-card-foreground">{valor}</p>
      {descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}
    </Cartao>
  )
}
