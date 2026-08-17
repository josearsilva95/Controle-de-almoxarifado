import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { classesBotaoIcone } from './ui/Botao'
import { EQUIPES, rotuloEquipe } from '../lib/equipes'
import { formatDataHora } from '../lib/tempo'
import type { EquipeEstoque, EstoqueContagem, EstoqueItem, Profile } from '../types/database'

interface InventarioContagensRecentesProps {
  itens: EstoqueItem[]
  contagens: EstoqueContagem[]
  perfis: Record<string, Profile>
}

const LINHAS_POR_PAGINA = 25

// Feed ao vivo de cada contagem registrada — pra acompanhar os valores
// sendo lançados conforme o inventário acontece, não só o resumo agregado.
// Abas por equipe + paginação em vez de um limite fixo, pra dar espaço de
// verdade pra olhar tudo (visualização mais ampla que a lista curta de antes).
export function InventarioContagensRecentes({ itens, contagens, perfis }: InventarioContagensRecentesProps) {
  const [equipeFiltro, setEquipeFiltro] = useState<EquipeEstoque | 'todas'>('todas')
  const [pagina, setPagina] = useState(1)

  const linhasOrdenadas = useMemo(() => {
    const itensPorId = new Map(itens.map((i) => [i.id, i]))
    return contagens
      .map((c) => ({ contagem: c, item: itensPorId.get(c.item_id) }))
      .filter((l): l is { contagem: EstoqueContagem; item: EstoqueItem } => Boolean(l.item))
      .sort((a, b) => new Date(b.contagem.contado_em).getTime() - new Date(a.contagem.contado_em).getTime())
  }, [contagens, itens])

  const linhasFiltradas = useMemo(() => {
    if (equipeFiltro === 'todas') return linhasOrdenadas
    return linhasOrdenadas.filter((l) => l.contagem.equipe === equipeFiltro)
  }, [linhasOrdenadas, equipeFiltro])

  useEffect(() => {
    setPagina(1)
  }, [equipeFiltro])

  const totalPaginas = Math.max(1, Math.ceil(linhasFiltradas.length / LINHAS_POR_PAGINA))
  const linhasDaPagina = linhasFiltradas.slice((pagina - 1) * LINHAS_POR_PAGINA, pagina * LINHAS_POR_PAGINA)

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-card-foreground">
          Contagens recentes <span className="font-normal text-muted-foreground">({linhasFiltradas.length})</span>
        </h3>
        <div className="flex gap-1.5">
          <button
            type="button"
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              equipeFiltro === 'todas'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40'
            }`}
            onClick={() => setEquipeFiltro('todas')}
          >
            Todas
          </button>
          {EQUIPES.map((equipe) => (
            <button
              key={equipe}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                equipeFiltro === equipe
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
              onClick={() => setEquipeFiltro(equipe)}
            >
              {rotuloEquipe(equipe)}
            </button>
          ))}
        </div>
      </div>

      {linhasFiltradas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma contagem registrada ainda.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5">Código</th>
                  <th className="px-3 py-2.5">Descrição</th>
                  <th className="px-3 py-2.5">Lote</th>
                  <th className="px-3 py-2.5">Equipe</th>
                  <th className="px-3 py-2.5">Quantidade</th>
                  <th className="px-3 py-2.5">Quem</th>
                  <th className="px-3 py-2.5">Quando</th>
                </tr>
              </thead>
              <tbody>
                {linhasDaPagina.map(({ contagem, item }) => (
                  <tr key={contagem.id} className="border-t border-border">
                    <td className="px-3 py-2.5 font-medium text-card-foreground">{item.codigo}</td>
                    <td className="px-3 py-2.5 text-card-foreground">{item.descricao}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{contagem.lote || '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{rotuloEquipe(contagem.equipe)}</td>
                    <td className="px-3 py-2.5 font-semibold text-card-foreground">{contagem.quantidade}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {perfis[contagem.contado_por]?.nome_completo ?? 'Desconhecido'}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDataHora(contagem.contado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                página {pagina} de {totalPaginas}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`${classesBotaoIcone()} border border-border disabled:pointer-events-none disabled:opacity-40`}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={`${classesBotaoIcone()} border border-border disabled:pointer-events-none disabled:opacity-40`}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
