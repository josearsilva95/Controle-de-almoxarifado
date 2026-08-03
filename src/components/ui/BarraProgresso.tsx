export function BarraProgresso({ percent }: { percent: number }) {
  const largura = Math.max(0, Math.min(100, percent))
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${largura}%` }} />
    </div>
  )
}
