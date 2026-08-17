import { useMemo, useState } from 'react'
import { AlertTriangle, Check, Lock } from 'lucide-react'
import { classesBotaoIcone } from './ui/Botao'
import { filtrarItensEstoque } from '../lib/buscaEstoque'
import { registrarContagem } from '../lib/acoesEstoque'
import { compararContagens } from '../lib/inventarioComparacao'
import type { EstoqueContagem, EstoqueItem } from '../types/database'

interface InventarioDivergenciasProps {
  itens: EstoqueItem[]
  contagens: EstoqueContagem[]
  usuarioId: string
  onContado: () => void
}

interface Divergencia {
  item: EstoqueItem
  lote: string
  temLote: boolean
  qtdEquipe1: number
  qtdEquipe2: number
  qtdEquipe3: number | null
}

function LinhaDivergencia({
  divergencia,
  usuarioId,
  onContado,
}: {
  divergencia: Divergencia
  usuarioId: string
  onContado: () => void
}) {
  const [valor, setValor] = useState(divergencia.qtdEquipe3 != null ? String(divergencia.qtdEquipe3) : '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const resolvida = divergencia.qtdEquipe3 != null

  async function salvar() {
    const numero = Number(valor)
    if (!Number.isInteger(numero) || numero < 0) {
      setErro('Quantidade inválida')
      return
    }
    setSalvando(true)
    setErro(null)
    const { erro: erroAcao } = await registrarContagem(
      divergencia.item.id,
      'equipe_3',
      divergencia.lote,
      numero,
      usuarioId
    )
    setSalvando(false)
    if (erroAcao) {
      setErro(erroAcao)
      return
    }
    onContado()
  }

  return (
    <tr className={`border-t border-border ${resolvida ? '' : 'bg-destructive/5'}`}>
      <td className="px-3 py-2.5 font-medium text-card-foreground">{divergencia.item.codigo}</td>
      <td className="px-3 py-2.5 text-card-foreground">{divergencia.item.descricao}</td>
      <td className="px-3 py-2.5 text-muted-foreground">{divergencia.temLote ? divergencia.lote : '—'}</td>
      <td className="px-3 py-2.5 text-muted-foreground">{divergencia.qtdEquipe1}</td>
      <td className="px-3 py-2.5 text-muted-foreground">{divergencia.qtdEquipe2}</td>
      <td className="px-3 py-2.5">
        {resolvida ? (
          <div className="flex items-center gap-1.5 text-sm text-card-foreground">
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="font-semibold">{divergencia.qtdEquipe3}</span>
            <span className="text-xs text-muted-foreground">— enviado, só admin corrige</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <input
                className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                type="number"
                min={0}
                step={1}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
              <button
                type="button"
                className={classesBotaoIcone()}
                onClick={salvar}
                disabled={salvando || !valor}
                aria-label={`Salvar contagem final de ${divergencia.item.codigo}`}
                title="Salvar"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
            {erro && <p className="mt-1 text-xs text-destructive">{erro}</p>}
          </>
        )}
      </td>
    </tr>
  )
}

export function InventarioDivergencias({ itens, contagens, usuarioId, onContado }: InventarioDivergenciasProps) {
  const [busca, setBusca] = useState('')

  const divergencias = useMemo(() => {
    return compararContagens(itens, contagens)
      .filter((l) => l.divergeEntreEquipes)
      .map(
        (l): Divergencia => ({
          item: l.item,
          lote: l.lote,
          temLote: l.temLote,
          qtdEquipe1: l.equipe1 as number,
          qtdEquipe2: l.equipe2 as number,
          qtdEquipe3: l.equipe3,
        })
      )
      .sort((a, b) => a.item.codigo.localeCompare(b.item.codigo) || a.lote.localeCompare(b.lote))
  }, [contagens, itens])

  const divergenciasFiltradas = useMemo(() => {
    if (!busca.trim()) return divergencias
    const itensDivergentes = divergencias.map((d) => d.item)
    const filtrados = new Set(filtrarItensEstoque(itensDivergentes, busca).map((i) => i.id))
    return divergencias.filter((d) => filtrados.has(d.item.id))
  }, [divergencias, busca])

  const pendentes = divergencias.filter((d) => d.qtdEquipe3 == null).length

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {divergencias.length} itens/lotes com contagens diferentes entre equipe 1 e equipe 2
        {divergencias.length > 0 && ` · ${pendentes} ainda sem resolução`}
      </div>

      <div className="mb-4 sm:max-w-sm">
        <input
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          type="text"
          placeholder="Buscar por código ou descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {divergenciasFiltradas.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {divergencias.length === 0 ? 'Nenhuma divergência até agora.' : 'Nenhuma divergência encontrada.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Código</th>
                <th className="px-3 py-2.5">Descrição</th>
                <th className="px-3 py-2.5">Lote</th>
                <th className="px-3 py-2.5">Equipe 1</th>
                <th className="px-3 py-2.5">Equipe 2</th>
                <th className="px-3 py-2.5">Contagem final</th>
              </tr>
            </thead>
            <tbody>
              {divergenciasFiltradas.map((d) => (
                <LinhaDivergencia
                  key={`${d.item.id}::${d.lote}`}
                  divergencia={d}
                  usuarioId={usuarioId}
                  onContado={onContado}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
