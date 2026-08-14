import { useMemo } from 'react'
import { Cartao } from './ui/Cartao'
import { supabase } from '../lib/supabaseClient'
import { rotuloRole } from '../lib/cores'
import { EQUIPES, rotuloEquipe } from '../lib/equipes'
import type { EquipeEstoque, Profile } from '../types/database'

interface EstoqueEquipesProps {
  perfis: Record<string, Profile>
  onAtualizado: () => void
}

function classesOpcao(ativo: boolean): string {
  return `rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
    ativo ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
  }`
}

export function EstoqueEquipes({ perfis, onAtualizado }: EstoqueEquipesProps) {
  const colaboradores = useMemo(
    () =>
      Object.values(perfis)
        .filter((p) => !p.oculto)
        .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo)),
    [perfis]
  )

  async function definirEquipe(perfil: Profile, equipe: EquipeEstoque | null) {
    const { error } = await supabase.from('profiles').update({ equipe_estoque: equipe }).eq('id', perfil.id)
    if (error) {
      window.alert(`Não foi possível atualizar: ${error.message}`)
      return
    }
    onAtualizado()
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Escolha a equipe de cada colaborador. Quem tiver uma equipe passa a ver a aba Inventário no menu dele —
        equipe 1 e equipe 2 contam de forma independente, equipe 3 resolve o que ficar diferente entre elas.
      </p>
      <div className="space-y-2">
        {colaboradores.map((perfil) => (
          <Cartao key={perfil.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <p className="text-sm font-medium text-card-foreground">{perfil.nome_completo}</p>
              <p className="text-xs text-muted-foreground">{rotuloRole(perfil.role)}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={classesOpcao(perfil.equipe_estoque === null)}
                onClick={() => definirEquipe(perfil, null)}
              >
                Nenhuma
              </button>
              {EQUIPES.map((equipe) => (
                <button
                  key={equipe}
                  type="button"
                  className={classesOpcao(perfil.equipe_estoque === equipe)}
                  onClick={() => definirEquipe(perfil, equipe)}
                >
                  {rotuloEquipe(equipe)}
                </button>
              ))}
            </div>
          </Cartao>
        ))}
      </div>
    </div>
  )
}
