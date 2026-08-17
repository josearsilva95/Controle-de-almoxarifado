import { useState } from 'react'
import { MapPin, ScanBarcode } from 'lucide-react'
import { ScannerCodigoBarras } from './ScannerCodigoBarras'
import type { EstoqueLocal } from '../types/database'

interface LocalAtivoBarProps {
  locais: EstoqueLocal[]
  localAtivo: string | null
  onMudarLocal: (codigo: string) => void
}

// Local ativo é "sticky": bipar/escolher um local uma vez marca o contexto
// atual, e cada item contado depois disso é gravado nesse local — até
// bipar/escolher um local diferente. Não há "avançar/voltar": o local
// ativo é sempre o último bipado, seja o próximo da fila ou um anterior.
export function LocalAtivoBar({ locais, localAtivo, onMudarLocal }: LocalAtivoBarProps) {
  const [escaneando, setEscaneando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function validarEDefinir(codigoBruto: string) {
    const encontrado = locais.find((l) => l.codigo.toLowerCase() === codigoBruto.trim().toLowerCase())
    if (!encontrado) {
      setErro(`Local "${codigoBruto}" não está cadastrado.`)
      return
    }
    setErro(null)
    onMudarLocal(encontrado.codigo)
  }

  function handleLido(codigo: string) {
    setEscaneando(false)
    validarEDefinir(codigo)
  }

  return (
    <div className="mb-4 rounded-md border border-border bg-card px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          {localAtivo ? (
            <span className="text-card-foreground">
              Local ativo: <span className="font-semibold">{localAtivo}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Nenhum local ativo — bipe a etiqueta da prateleira.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            value=""
            onChange={(e) => {
              if (e.target.value) validarEDefinir(e.target.value)
            }}
          >
            <option value="">Escolher local...</option>
            {locais.map((l) => (
              <option key={l.id} value={l.codigo}>
                {l.codigo}
                {l.rotulo ? ` — ${l.rotulo}` : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
            onClick={() => {
              setErro(null)
              setEscaneando(true)
            }}
          >
            <ScanBarcode className="h-4 w-4" />
            Bipar local
          </button>
        </div>
      </div>
      {erro && <p className="mt-2 text-xs text-destructive">{erro}</p>}
      {escaneando && <ScannerCodigoBarras onLido={handleLido} onFechar={() => setEscaneando(false)} />}
    </div>
  )
}
