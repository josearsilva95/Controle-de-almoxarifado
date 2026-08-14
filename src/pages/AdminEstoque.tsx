import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Pencil, Search, Trash2 } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { EstoqueItemModal } from '../components/EstoqueItemModal'
import { Botao, classesBotaoIcone } from '../components/ui/Botao'
import { useEstoque } from '../hooks/useEstoque'
import { supabase } from '../lib/supabaseClient'
import { rotuloDeposito } from '../lib/depositos'
import { gerarPdfEstoque } from '../lib/estoquePdf'
import type { EstoqueItem } from '../types/database'

const ITENS_POR_PAGINA = 50

export function AdminEstoque() {
  const { itens, carregando, recarregar } = useEstoque()
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [itemEditando, setItemEditando] = useState<EstoqueItem | null>(null)
  const [criando, setCriando] = useState(false)

  // Só pra alimentar a sugestão de categoria no modal de novo/editar item —
  // não vira filtro visual na tela, é livre digitação com autocomplete.
  const categoriasExistentes = useMemo(() => {
    const nomes = new Set<string>()
    for (const item of itens) if (item.categoria) nomes.add(item.categoria)
    return [...nomes].sort((a, b) => a.localeCompare(b))
  }, [itens])

  // Busca por palavras, em qualquer ordem: cada palavra digitada precisa
  // aparecer em algum lugar (código, descrição ou categoria) — não precisa ser
  // um trecho contínuo nem a palavra inteira. "PARAF M16 X 50" acha
  // "PARAFUSO SEXTAVADO M16 X 50 DIN...", mesmo abreviado e fora de ordem.
  const itensFiltrados = useMemo(() => {
    const termos = busca.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (termos.length === 0) return itens
    return itens.filter((item) => {
      const alvo = `${item.codigo} ${item.descricao} ${item.categoria ?? ''}`.toLowerCase()
      return termos.every((termo) => alvo.includes(termo))
    })
  }, [itens, busca])

  // Volta pra página 1 sempre que a busca muda — senão dá pra "sumir" numa
  // página que não existe mais pro resultado novo.
  useEffect(() => {
    setPagina(1)
  }, [busca])

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
    gerarPdfEstoque(itensFiltrados, busca.trim() ? `busca "${busca.trim()}"` : 'todos os itens')
  }

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Estoque</h2>
          <p className="text-sm text-muted-foreground">Catálogo de itens para conferência na auditoria.</p>
        </div>
        <div className="flex gap-2">
          <Botao variante="secundaria" tamanho="sm" onClick={baixarPdf} disabled={itensFiltrados.length === 0}>
            <Download className="h-4 w-4" />
            Baixar PDF
          </Botao>
          <Botao tamanho="sm" onClick={() => setCriando(true)}>
            + Novo Item
          </Botao>
        </div>
      </div>

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
                  <th className="px-3 py-2.5">Quantidade</th>
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

      {(criando || itemEditando) && (
        <EstoqueItemModal
          item={itemEditando}
          categoriasExistentes={categoriasExistentes}
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
