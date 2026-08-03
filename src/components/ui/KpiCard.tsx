import { Cartao } from './Cartao'

interface KpiCardProps {
  label: string
  valor: string
}

export function KpiCard({ label, valor }: KpiCardProps) {
  return (
    <Cartao>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-card-foreground">{valor}</p>
    </Cartao>
  )
}
