import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'
import { InventarioContagem } from '../components/InventarioContagem'
import { InventarioDivergencias } from '../components/InventarioDivergencias'
import { InventarioProgresso } from '../components/InventarioProgresso'
import { useEstoque } from '../hooks/useEstoque'
import { useEstoqueContagens } from '../hooks/useEstoqueContagens'
import { podeAdministrar } from '../lib/permissoes'

export function Inventario() {
  const { profile } = useAuth()
  const { itens, carregando: carregandoItens } = useEstoque()
  const { contagens, carregando: carregandoContagens, recarregar } = useEstoqueContagens()

  if (!profile) return null

  const carregando = carregandoItens || carregandoContagens
  const administra = podeAdministrar(profile)
  // Admin/líder sem equipe própria acompanham o inventário geral: progresso
  // de cada equipe + as mesmas divergências que a equipe 3 vê (e também
  // podem resolver, já que a RLS libera insert de equipe_3 pra quem administra).
  const acompanhandoGeral = administra && !profile.equipe_estoque

  return (
    <AppShell>
      <h2 className="text-lg font-semibold text-foreground">Inventário</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        {profile.equipe_estoque === 'equipe_3'
          ? 'Resolva as divergências entre a contagem da equipe 1 e da equipe 2.'
          : acompanhandoGeral
            ? 'Progresso das equipes em tempo real e divergências entre as contagens.'
            : 'Busque o item e registre a quantidade contada.'}
      </p>

      {carregando && <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>}

      {!carregando && (profile.equipe_estoque === 'equipe_1' || profile.equipe_estoque === 'equipe_2') && (
        <InventarioContagem
          itens={itens}
          contagens={contagens}
          equipe={profile.equipe_estoque}
          usuarioId={profile.id}
          onContado={recarregar}
        />
      )}

      {!carregando && (profile.equipe_estoque === 'equipe_3' || acompanhandoGeral) && (
        <>
          {acompanhandoGeral && <InventarioProgresso itens={itens} contagens={contagens} />}
          <InventarioDivergencias itens={itens} contagens={contagens} usuarioId={profile.id} onContado={recarregar} />
        </>
      )}

      {!carregando && !profile.equipe_estoque && !administra && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Você não está em nenhuma equipe de inventário. Um admin pode te colocar em uma pela aba Equipes, dentro
          de Estoque.
        </p>
      )}
    </AppShell>
  )
}
