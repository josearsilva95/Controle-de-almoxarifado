import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Pencil, Search, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'
import { EstoqueItemModal } from '../components/EstoqueItemModal'
import { EstoqueEquipes } from '../components/EstoqueEquipes'
import { InventarioContagem } from '../components/InventarioContagem'
import { InventarioDivergencias } from '../components/InventarioDivergencias'
import { InventarioPendencias } from '../components/InventarioPendencias'
import { InventarioProgresso } from '../components/InventarioProgresso'
import { Botao, classesBotaoIcone } from '../components/ui/Botao'
import { usePerfis } from '../hooks/usePerfis'
import { useEstoque } from '../hooks/useEstoque'
import { useEstoqueContagens } from '../hooks/useEstoqueContagens'
import { useEstoqueEquipesStatus } from '../hooks/useEstoqueEquipesStatus'
import { supabase } from '../lib/supabaseClient'
import { rotuloDeposito } from '../lib/depositos'
import { filtrarItensEstoque } from '../lib/buscaEstoque'
import { podeAdministrar } from '../lib/permissoes'
import { gerarPdfEstoque } from '../lib/estoquePdf'
import { gerarPdfInventario } from '../lib/inventarioPdf'
import type { EstoqueItem } from '../types/database'

const ITENS_POR_PAGINA = 50
const SEM_CATEGORIA = 'Sem categoria'
type Modo = 'catalogo' | 'equipes' | 'inventario'

export function AdminEstoque() {
  const { profile } = useAuth()
  const { itens, carregando, recarregar } = useEstoque()
  const { contagens, recarregar: recarregarContagens } = useEstoqueContagens()
  const { status: statusEquipes, recarregar: recarregarStatus } = useEstoqueEquipesStatus()
  const { perfis, recarregar: recarregarPerfis } = usePerfis()
  const [modo, setModo] = useState<Modo>('catalogo')
  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState('todas')
  const [pagina, setPagina] = useState(1)
  const [itemEditando, setItemEditando] = useState<EstoqueItem | null>(null)
  const [criando, setCriando] = useState(false)

  const categorias = useMemo(() => {
    const contagem = new Map<string, number>()
    for (const item of itens) {
      const nome = item.categoria || SEM_CATEGORIA
      contagem.set(nome, (contagem.get(nome) ?? 0) + 1)
    }
    return [...contagem.entries()].sort((a, b) => b[1] - a[1])
  }, [itens])

  // "Todas" é o padrão — sem clicar em nenhuma aba, a busca já cobre tudo.
  const itensDaCategoria = useMemo(() => {
    if (categoriaAtiva === 'todas') return itens
    return itens.filter((item) => (item.categoria || SEM_CATEGORIA) === categoriaAtiva)
  }, [itens, categoriaAtiva])

  const itensFiltrados = useMemo(
    () => filtrarItensEstoque(itensDaCategoria, busca),
    [itensDaCategoria, busca]
  )

  // Volta pra página 1 sempre que o filtro muda — senão dá pra "sumir" numa
  // página que não existe mais pro resultado novo.
  useEffect(() => {
    setPagina(1)
  }, [busca, categoriaAtiva])

  const totalPaginas = Math.max(1, Math.ceil(itensFiltrados.length / ITENS_POR_PAGINA))
  const itensDaPagina = itensFiltrados.slice((pagina - 1) * ITENS_POR_PAGINA, pagina * ITENS_POR_PAGINA)

  async function excluirItem(item: EstoqueItem) {
    const confirmado = window.confirm(`Excluir o item ${item.codigo} — ${item.descricao}?`)
    if (!confirmado) return

    const { error } = await supabase.from('estoque_itens').delete().eq('id', item.id)
    if (error) {
      window.alert(`Não foi possível excluir: ${error.message}`)
      return
    }
    recarregar()
  }

  function baixarPdf() {
    const rotulo = categoriaAtiva === 'todas' ? 'todos os itens' : categoriaAtiva
    gerarPdfEstoque(itensFiltrados, busca.trim() ? `${rotulo} · busca "${busca.trim()}"` : rotulo)
  }

  function baixarPdfInventario() {
    gerarPdfInventario(itens, contagens)
  }

  if (!profile) return null

  // Colaborador de equipe (sem ser admin/líder): só a própria tela de
  // contagem ou de divergências, sem abas de catálogo/equipes.
  if (!podeAdministrar(profile)) {
    const statusEquipe = statusEquipes.find((s) => s.equipe === profile.equipe_estoque)
    return (
      <AppShell>
        <h2 className="text-lg font-semibold text-foreground">Estoque</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          {profile.equipe_estoque === 'equipe_3'
            ? 'Resolva as divergências entre a contagem da equipe 1 e da equipe 2.'
            : 'Busque o item e registre a quantidade contada.'}
        </p>

        {(profile.equipe_estoque === 'equipe_1' || profile.equipe_estoque === 'equipe_2') && (
          <InventarioContagem
            itens={itens}
            contagens={contagens}
            equipe={profile.equipe_estoque}
            usuarioId={profile.id}
            statusEquipe={statusEquipe}
            onContado={recarregarContagens}
            onStatusMudou={recarregarStatus}
          />
        )}

        {profile.equipe_estoque === 'equipe_3' && (
          <>
            <InventarioDivergencias
              itens={itens}
              contagens={contagens}
              usuarioId={profile.id}
              onContado={recarregarContagens}
            />
            <InventarioPendencias itens={itens} contagens={contagens} statusEquipes={statusEquipes} />
          </>
        )}
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Estoque</h2>
          <p className="text-sm text-muted-foreground">Catálogo oficial de itens e equipes do inventário.</p>
        </div>
        <div className="flex gap-2">
          {modo === 'catalogo' && (
            <Botao variante="secundaria" tamanho="sm" onClick={baixarPdf} disabled={itensFiltrados.length === 0}>
              <Download className="h-4 w-4" />
              Baixar PDF
            </Botao>
          )}
          {modo === 'inventario' && (
            <Botao variante="secundaria" tamanho="sm" onClick={baixarPdfInventario} disabled={itens.length === 0}>
              <Download className="h-4 w-4" />
              Baixar PDF do inventário
            </Botao>
          )}
          {modo === 'catalogo' && (
            <Botao tamanho="sm" onClick={() => setCriando(true)}>
              + Novo Item
            </Botao>
          )}
        </div>
      </div>

      <div className="mb-5 inline-flex rounded-md border border-border bg-card p-1">
        {(
          [
            ['catalogo', 'Catálogo'],
            ['equipes', 'Equipes'],
            ['inventario', 'Inventário'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              modo === valor ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-card-foreground'
            }`}
            onClick={() => setModo(valor)}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {modo === 'equipes' && <EstoqueEquipes perfis={perfis} onAtualizado={recarregarPerfis} />}

      {modo === 'inventario' && (
        <>
          <InventarioProgresso itens={itens} contagens={contagens} />
          <InventarioDivergencias
            itens={itens}
            contagens={contagens}
            usuarioId={profile.id}
            onContado={recarregarContagens}
          />
          <InventarioPendencias itens={itens} contagens={contagens} statusEquipes={statusEquipes} />
        </>
      )}

      {modo === 'catalogo' && (
        <>
          <div className="mb-4 flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 sm:max-w-sm">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              className="w-full bg-transparent text-sm text-foreground outline-none"
              type="text"
              placeholder="Buscar por código ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          {!carregando && itens.length > 0 && (
            <div className="mb-5 flex items-center gap-5 overflow-x-auto border-b border-border">
              <button
                type="button"
                className={`flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                  categoriaAtiva === 'todas'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-card-foreground'
                }`}
                onClick={() => setCategoriaAtiva('todas')}
              >
                Todas
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                    categoriaAtiva === 'todas' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {itens.length}
                </span>
              </button>
              {categorias.map(([nome, total]) => (
                <button
                  key={nome}
                  type="button"
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                    categoriaAtiva === nome
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-card-foreground'
                  }`}
                  onClick={() => setCategoriaAtiva(nome)}
                >
                  {nome}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                      categoriaAtiva === nome ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {total}
                  </span>
                </button>
              ))}
            </div>
          )}

          {carregando && <p className="py-8 text-center text-sm text-muted-foreground">Carregando estoque...</p>}
          {!carregando && itens.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item cadastrado ainda.</p>
          )}
          {!carregando && itens.length > 0 && itensFiltrados.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item encontrado.</p>
          )}

          {!carregando && itensFiltrados.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2.5">Código</th>
                      <th className="px-3 py-2.5">Descrição</th>
                      <th className="px-3 py-2.5">Categoria</th>
                      <th className="px-3 py-2.5">Depósito</th>
                      <th className="px-3 py-2.5">Qtd. sistema</th>
                      <th className="px-3 py-2.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensDaPagina.map((item) => (
                      <tr key={item.id} className="border-t border-border hover:bg-muted/40">
                        <td className="px-3 py-2.5 font-medium text-card-foreground">{item.codigo}</td>
                        <td className="px-3 py-2.5 text-card-foreground">{item.descricao}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{item.categoria || '—'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{rotuloDeposito(item.deposito)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {item.quantidade != null ? item.quantidade : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              className={classesBotaoIcone()}
                              onClick={() => setItemEditando(item)}
                              aria-label={`Editar ${item.codigo}`}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className={classesBotaoIcone(true)}
                              onClick={() => excluirItem(item)}
                              aria-label={`Excluir ${item.codigo}`}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {itensFiltrados.length} itens · página {pagina} de {totalPaginas}
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
        </>
      )}

      {(criando || itemEditando) && (
        <EstoqueItemModal
          item={itemEditando}
          categoriasExistentes={categorias.map(([nome]) => nome).filter((nome) => nome !== SEM_CATEGORIA)}
          onFechar={() => {
            setCriando(false)
            setItemEditando(null)
          }}
          onSalvo={() => {
            setCriando(false)
            setItemEditando(null)
            recarregar()
          }}
        />
      )}
    </AppShell>
  )
}
