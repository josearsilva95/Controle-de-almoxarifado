import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Cartao } from './ui/Cartao'
import type { LinhaComparacao } from '../lib/inventarioComparacao'

interface RelatorioInventarioAlertasProps {
  linhas: LinhaComparacao[]
}

function ListaAlerta({
  titulo,
  descricao,
  itens,
}: {
  titulo: string
  descricao: string
  itens: { codigo: string; descricao: string; lote: string | null; texto: string }[]
}) {
  return (
    <Cartao>
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        <h3 className="text-base font-semibold text-card-foreground">
          {titulo} <span className="font-normal text-muted-foreground">({itens.length})</span>
        </h3>
      </div>
      <p className="text-sm text-muted-foreground">{descricao}</p>
      {itens.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Nenhum caso no momento.</p>
      ) : (
        <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto text-sm">
          {itens.map((item) => (
            <li
              key={item.codigo}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-destructive/10 px-2.5 py-2"
            >
              <div className="min-w-0">
                <span className="font-medium text-destructive">{item.codigo}</span>{' '}
                <span className="truncate text-destructive/80">{item.descricao}</span>
                {item.lote && <div className="text-xs text-destructive/70">Lote(s): {item.lote}</div>}
              </div>
              <span className="shrink-0 rounded-full bg-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">
                {item.texto}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  )
}

// Três alertas de inventário, lado a lado com o resto de Relatórios: cada
// equipe contra o sistema, e as duas equipes entre si. Reaproveita
// compararContagens (mesma lógica do Excel/PDF do inventário).
export function RelatorioInventarioAlertas({ linhas }: RelatorioInventarioAlertasProps) {
  const alertasSistemaEquipe1 = useMemo(
    () =>
      linhas
        .filter((l) => l.divergeSistemaEquipe1)
        .map((l) => ({
          codigo: l.item.codigo,
          descricao: l.item.descricao,
          lote: l.item.lotes,
          texto: `sistema ${l.sistema} · equipe 1 contou ${l.equipe1}`,
        })),
    [linhas]
  )

  const alertasSistemaEquipe2 = useMemo(
    () =>
      linhas
        .filter((l) => l.divergeSistemaEquipe2)
        .map((l) => ({
          codigo: l.item.codigo,
          descricao: l.item.descricao,
          lote: l.item.lotes,
          texto: `sistema ${l.sistema} · equipe 2 contou ${l.equipe2}`,
        })),
    [linhas]
  )

  const alertasEntreEquipes = useMemo(
    () =>
      linhas
        .filter((l) => l.divergeEntreEquipes)
        .map((l) => ({
          codigo: l.item.codigo,
          descricao: l.item.descricao,
          lote: l.item.lotes,
          texto: `equipe 1: ${l.equipe1} · equipe 2: ${l.equipe2}`,
        })),
    [linhas]
  )

  return (
    <div className="mt-4">
      <h3 className="mb-3 text-base font-semibold text-foreground">Alertas de inventário</h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ListaAlerta
          titulo="Equipe 1 x Sistema"
          descricao="Itens em que a equipe 1 contou diferente da quantidade oficial."
          itens={alertasSistemaEquipe1}
        />
        <ListaAlerta
          titulo="Equipe 2 x Sistema"
          descricao="Itens em que a equipe 2 contou diferente da quantidade oficial."
          itens={alertasSistemaEquipe2}
        />
        <ListaAlerta
          titulo="Equipe 1 x Equipe 2"
          descricao="Itens em que as duas contagens bateram diferente entre si."
          itens={alertasEntreEquipes}
        />
      </div>
    </div>
  )
}
