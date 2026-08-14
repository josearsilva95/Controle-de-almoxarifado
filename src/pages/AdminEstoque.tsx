import { useMemo, useState } from 'react'
import { Download, Pencil, Search, Trash2 } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { EstoqueItemModal } from '../components/EstoqueItemModal'
import { Botao, classesBotaoIcone } from '../components/ui/Botao'
import { useEstoque } from '../hooks/useEstoque'
import { supabase } from '../lib/supabaseClient'
import { rotuloDeposito } from '../lib/depositos'
import { gerarPdfEstoque } from '../lib/estoquePdf'
import type { EstoqueItem } from '../types/database'

export function AdminEstoque() {
  const { itens, carregando, recarregar } = useEstoque()
  const [busca, setBusca] = useState('')
  const [itemEditando, setItemEditando] = useState<EstoqueItem | null>(null)
  const [criando, setCriando] = useState(false)

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return itens
    return itens.filter(
      (item) => item.codigo.toLowerCase().includes(termo) || item.descricao.toLowerCase().includes(termo)
    )
  }, [itens, busca])

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
    gerarPdfEstoque(itensFiltrados, busca.trim() ? 'filtro aplicado' : 'todos os itens')
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
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item encontrado para "{busca}".</p>
      )}

      {!carregando && itensFiltrados.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Código</th>
                <th className="px-3 py-2.5">Descrição</th>
                <th className="px-3 py-2.5">Depósito</th>
                <th className="px-3 py-2.5">Quantidade</th>
                <th className="px-3 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.map((item) => (
                <tr key={item.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-3 py-2.5 font-medium text-card-foreground">{item.codigo}</td>
                  <td className="px-3 py-2.5 text-card-foreground">{item.descricao}</td>
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
      )}

      {(criando || itemEditando) && (
        <EstoqueItemModal
          item={itemEditando}
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
