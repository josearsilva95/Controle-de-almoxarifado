import { useState } from 'react'
import type { FormEvent } from 'react'
import { MapPin, ScanBarcode } from 'lucide-react'
import { ScannerCodigoBarras } from './ScannerCodigoBarras'
import { Botao } from './ui/Botao'
import { criarLocal } from '../lib/acoesEstoque'
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
  const [codigoNaoCadastrado, setCodigoNaoCadastrado] = useState<string | null>(null)
  const [rotuloNovo, setRotuloNovo] = useState('')
  const [cadastrando, setCadastrando] = useState(false)

  function validarEDefinir(codigoBruto: string) {
    const codigo = codigoBruto.trim()
    const encontrado = locais.find((l) => l.codigo.toLowerCase() === codigo.toLowerCase())
    if (!encontrado) {
      setErro(null)
      setRotuloNovo('')
      setCodigoNaoCadastrado(codigo)
      return
    }
    setErro(null)
    setCodigoNaoCadastrado(null)
    onMudarLocal(encontrado.codigo)
  }

  function handleLido(codigo: string) {
    setEscaneando(false)
    validarEDefinir(codigo)
  }

  async function cadastrarECadastrar(evento: FormEvent) {
    evento.preventDefault()
    if (!codigoNaoCadastrado) return
    setCadastrando(true)
    setErro(null)
    const { erro: erroAcao } = await criarLocal(codigoNaoCadastrado, rotuloNovo || null)
    setCadastrando(false)
    if (erroAcao) {
      setErro(erroAcao)
      return
    }
    onMudarLocal(codigoNaoCadastrado)
    setCodigoNaoCadastrado(null)
    setRotuloNovo('')
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
      {codigoNaoCadastrado && (
        <form onSubmit={cadastrarECadastrar} className="mt-2 flex flex-wrap items-end gap-2 rounded-md border border-border bg-muted/30 p-2.5">
          <p className="w-full text-xs text-muted-foreground">
            Local <span className="font-semibold text-card-foreground">"{codigoNaoCadastrado}"</span> não está
            cadastrado. Cadastrar agora?
          </p>
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-card-foreground">
            Rótulo (opcional)
            <input
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              type="text"
              placeholder="Ex: Unidade 1, nível 1, esquerda"
              value={rotuloNovo}
              onChange={(e) => setRotuloNovo(e.target.value)}
              autoFocus
            />
          </label>
          <Botao type="submit" tamanho="sm" disabled={cadastrando}>
            {cadastrando ? 'Cadastrando...' : 'Cadastrar e abrir'}
          </Botao>
          <Botao
            type="button"
            variante="fantasma"
            tamanho="sm"
            onClick={() => {
              setCodigoNaoCadastrado(null)
              setRotuloNovo('')
            }}
          >
            Cancelar
          </Botao>
        </form>
      )}
      {escaneando && <ScannerCodigoBarras onLido={handleLido} onFechar={() => setEscaneando(false)} />}
    </div>
  )
}
