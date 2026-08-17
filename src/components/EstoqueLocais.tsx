import { useState } from 'react'
import type { FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Cartao } from './ui/Cartao'
import { Botao, classesBotaoIcone } from './ui/Botao'
import { criarLocal, excluirLocal } from '../lib/acoesEstoque'
import type { EstoqueLocal } from '../types/database'

interface EstoqueLocaisProps {
  locais: EstoqueLocal[]
  onAtualizado: () => void
}

export function EstoqueLocais({ locais, onAtualizado }: EstoqueLocaisProps) {
  const [codigo, setCodigo] = useState('')
  const [rotulo, setRotulo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function adicionar(evento: FormEvent) {
    evento.preventDefault()
    if (!codigo.trim()) return
    setSalvando(true)
    setErro(null)
    const { erro: erroAcao } = await criarLocal(codigo, rotulo || null)
    setSalvando(false)
    if (erroAcao) {
      setErro(erroAcao)
      return
    }
    setCodigo('')
    setRotulo('')
    onAtualizado()
  }

  async function remover(local: EstoqueLocal) {
    const confirmado = window.confirm(`Excluir o local "${local.codigo}"?`)
    if (!confirmado) return
    const { erro } = await excluirLocal(local.id)
    if (erro) {
      window.alert(`Não foi possível excluir: ${erro}`)
      return
    }
    onAtualizado()
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Cadastre aqui os códigos das etiquetas de local (prateleira/nível/lado) que vão ser bipados durante a
        contagem — o código precisa ser exatamente o que está gravado na etiqueta física.
      </p>

      <Cartao className="mb-4 max-w-xl p-4">
        <form onSubmit={adicionar} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-card-foreground">
            Código
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              type="text"
              placeholder="Ex: 01a"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-card-foreground">
            Rótulo (opcional)
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              type="text"
              placeholder="Ex: Unidade 1, nível 1, esquerda"
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value)}
            />
          </label>
          <Botao type="submit" tamanho="sm" disabled={salvando}>
            {salvando ? 'Adicionando...' : 'Adicionar'}
          </Botao>
        </form>
        {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
      </Cartao>

      {locais.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum local cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Código</th>
                <th className="px-3 py-2.5">Rótulo</th>
                <th className="px-3 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {locais.map((local) => (
                <tr key={local.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium text-card-foreground">{local.codigo}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{local.rotulo || '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className={classesBotaoIcone(true)}
                        onClick={() => remover(local)}
                        aria-label={`Excluir ${local.codigo}`}
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
    </div>
  )
}
