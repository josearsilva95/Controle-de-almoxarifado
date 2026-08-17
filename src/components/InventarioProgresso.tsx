import { useMemo, useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { Cartao } from './ui/Cartao'
import { Botao } from './ui/Botao'
import { reabrirContagemEquipe } from '../lib/acoesEstoque'
import { rotuloEquipe } from '../lib/equipes'
import { formatDataHora } from '../lib/tempo'
import type { EquipeEstoque, EstoqueContagem, EstoqueEquipeStatus, EstoqueItem } from '../types/database'

interface InventarioProgressoProps {
  itens: EstoqueItem[]
  contagens: EstoqueContagem[]
  statusEquipes: EstoqueEquipeStatus[]
  onStatusMudou: () => void
}

// O número contado vem sozinho e em destaque — o total fica pequeno embaixo,
// separado, pra não dar a impressão de que a equipe já contou tudo.
function Estatistica({ label, valor, deTotal }: { label: string; valor: number; deTotal?: number }) {
  return (
    <Cartao className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-card-foreground">{valor}</p>
      {deTotal != null && <p className="text-xs text-muted-foreground">de {deTotal} itens</p>}
    </Cartao>
  )
}

function LinhaStatusEquipe({
  equipe,
  status,
  onStatusMudou,
}: {
  equipe: EquipeEstoque
  status: EstoqueEquipeStatus | undefined
  onStatusMudou: () => void
}) {
  const [reabrindo, setReabrindo] = useState(false)
  const finalizada = Boolean(status?.finalizada_em)

  async function reabrir() {
    setReabrindo(true)
    const { erro } = await reabrirContagemEquipe(equipe)
    setReabrindo(false)
    if (erro) {
      window.alert(`Não foi possível reabrir: ${erro}`)
      return
    }
    onStatusMudou()
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        {finalizada ? (
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <LockOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-medium text-card-foreground">{rotuloEquipe(equipe)}</span>
        <span className="text-muted-foreground">
          {finalizada && status?.finalizada_em
            ? `finalizada em ${formatDataHora(status.finalizada_em)}`
            : 'contagem em andamento'}
        </span>
      </div>
      {finalizada && (
        <Botao variante="secundaria" tamanho="sm" onClick={reabrir} disabled={reabrindo}>
          Reabrir
        </Botao>
      )}
    </div>
  )
}

export function InventarioProgresso({ itens, contagens, statusEquipes, onStatusMudou }: InventarioProgressoProps) {
  const stats = useMemo(() => {
    const porItem = new Map<string, Partial<Record<EquipeEstoque, number>>>()
    for (const c of contagens) {
      const atual = porItem.get(c.item_id) ?? {}
      atual[c.equipe] = c.quantidade
      porItem.set(c.item_id, atual)
    }
    let equipe1 = 0
    let equipe2 = 0
    let divergentes = 0
    let resolvidas = 0
    for (const item of itens) {
      const c = porItem.get(item.id) ?? {}
      if (c.equipe_1 != null) equipe1++
      if (c.equipe_2 != null) equipe2++
      if (c.equipe_1 != null && c.equipe_2 != null && c.equipe_1 !== c.equipe_2) {
        divergentes++
        if (c.equipe_3 != null) resolvidas++
      }
    }
    return { total: itens.length, equipe1, equipe2, divergentes, resolvidas }
  }, [itens, contagens])

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Estatistica label="Total de itens" valor={stats.total} />
        <Estatistica label="Equipe 1 contou" valor={stats.equipe1} deTotal={stats.total} />
        <Estatistica label="Equipe 2 contou" valor={stats.equipe2} deTotal={stats.total} />
        <Estatistica label="Divergências" valor={stats.divergentes} />
        <Estatistica label="Resolvidas pela equipe 3" valor={stats.resolvidas} deTotal={stats.divergentes} />
      </div>

      <Cartao className="mt-3 divide-y divide-border p-4">
        <p className="pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Status das equipes — admin pode reabrir se alguém finalizou sem querer
        </p>
        {(['equipe_1', 'equipe_2'] as const).map((equipe) => (
          <LinhaStatusEquipe
            key={equipe}
            equipe={equipe}
            status={statusEquipes.find((s) => s.equipe === equipe)}
            onStatusMudou={onStatusMudou}
          />
        ))}
      </Cartao>
    </div>
  )
}
