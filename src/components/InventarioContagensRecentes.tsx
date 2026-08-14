import { useMemo } from 'react'
import { rotuloEquipe } from '../lib/equipes'
import { formatDataHora } from '../lib/tempo'
import type { EstoqueContagem, EstoqueItem, Profile } from '../types/database'

interface InventarioContagensRecentesProps {
  itens: EstoqueItem[]
  contagens: EstoqueContagem[]
  perfis: Record<string, Profile>
}

const LIMITE = 100

// Feed ao vivo de cada contagem registrada (qualquer equipe) — pra
// acompanhar os valores sendo lançados conforme o inventário acontece, não
// só o resumo agregado. Já vem ordenado do mais recente pro mais antigo
// porque useEstoqueContagens já busca nessa ordem e atualiza via Realtime.
export function InventarioContagensRecentes({ itens, contagens, perfis }: InventarioContagensRecentesProps) {
  const linhas = useMemo(() => {
    const itensPorId = new Map(itens.map((i) => [i.id, i]))
    return contagens
      .map((c) => ({ contagem: c, item: itensPorId.get(c.item_id) }))
      .filter((l): l is { contagem: EstoqueContagem; item: EstoqueItem } => Boolean(l.item))
      .slice(0, LIMITE)
  }, [contagens, itens])

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-semibold text-card-foreground">
        Contagens recentes{' '}
        <span className="font-normal text-muted-foreground">
          ({contagens.length > LIMITE ? `${LIMITE} mais recentes de ${contagens.length}` : contagens.length})
        </span>
      </h3>
      {linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma contagem registrada ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Código</th>
                <th className="px-3 py-2.5">Descrição</th>
                <th className="px-3 py-2.5">Equipe</th>
                <th className="px-3 py-2.5">Quantidade</th>
                <th className="px-3 py-2.5">Quem</th>
                <th className="px-3 py-2.5">Quando</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ contagem, item }) => (
                <tr key={contagem.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium text-card-foreground">{item.codigo}</td>
                  <td className="px-3 py-2.5 text-card-foreground">{item.descricao}</td>
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
      )}
    </div>
  )
}
