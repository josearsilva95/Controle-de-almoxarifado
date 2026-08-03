import type { LucideIcon } from 'lucide-react'
import { Cartao } from './Cartao'

interface KpiCardProps {
  label: string
  valor: string
  icone: LucideIcon
}

export function KpiCard({ label, valor, icone: Icone }: KpiCardProps) {
  return (
    <Cartao>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icone className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-card-foreground">{valor}</p>
    </Cartao>
  )
}
