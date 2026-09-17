import { useUsoBanco, LIMITE_BANCO_MB } from '../hooks/useUsoBanco'

export function UsoBancoIndicador({ recolhida }: { recolhida: boolean }) {
  const { usadoMb } = useUsoBanco()
  if (usadoMb === null) return null

  const percentual = Math.min(100, (usadoMb / LIMITE_BANCO_MB) * 100)
  const critico = percentual >= 90
  const alerta = percentual >= 75

  return (
    <div
      className="mx-3 mb-3 rounded-md bg-slate-800 px-3 py-2"
      title={`Banco de dados: ${usadoMb.toFixed(1)} MB de ${LIMITE_BANCO_MB} MB usados`}
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-[width] ${critico ? 'bg-red-500' : alerta ? 'bg-amber-500' : 'bg-primary'}`}
          style={{ width: `${percentual}%` }}
        />
      </div>
      {!recolhida && (
        <p className="mt-1.5 hidden text-[11px] text-slate-400 md:block">
          {usadoMb.toFixed(0)} MB / {LIMITE_BANCO_MB} MB do banco
        </p>
      )}
    </div>
  )
}
