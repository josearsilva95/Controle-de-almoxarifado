import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabaseClient'
import { CORES, rotuloUrgencia } from '../lib/cores'
import { DEPOSITOS, rotuloDeposito } from '../lib/depositos'
import { AppShell } from '../components/AppShell'
import { Cartao } from '../components/ui/Cartao'
import { Botao } from '../components/ui/Botao'
import { classesBotaoSegmento, classesBotaoSegmentoCor } from '../components/ui/BotaoSegmento'
import type { Deposito, Urgencia } from '../types/database'

const OPCOES_URGENCIA: Urgencia[] = ['urgente', 'medio', 'nao_urgente']

export function AdminCadastrarPV() {
  const { profile } = useAuth()
  const [numeroPv, setNumeroPv] = useState('')
  const [cliente, setCliente] = useState('')
  const [quantidadeItens, setQuantidadeItens] = useState('')
  const [urgencia, setUrgencia] = useState<Urgencia>('nao_urgente')
  const [deposito, setDeposito] = useState<Deposito>('deposito_1')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  if (!profile) return null

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)
    setSucesso(null)

    const quantidade = Number(quantidadeItens)
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      setErro('Informe uma quantidade de itens válida.')
      return
    }

    setEnviando(true)

    const { error } = await supabase.from('pedidos').insert({
      numero_pv: numeroPv.trim(),
      cliente: cliente.trim(),
      quantidade_itens: quantidade,
      urgencia,
      deposito,
      criado_por: profile!.id,
    })

    setEnviando(false)
    if (error) {
      setErro(`Não foi possível cadastrar a requisição: ${error.message}`)
      return
    }
    setSucesso(`Requisição ${numeroPv} cadastrada com sucesso.`)
    setNumeroPv('')
    setCliente('')
    setQuantidadeItens('')
    setUrgencia('nao_urgente')
    setDeposito('deposito_1')
  }

  return (
    <AppShell>
      <div className="mb-4">
        <Link to="/admin" className="text-sm text-primary hover:underline">
          ← Voltar ao painel
        </Link>
      </div>

      <Cartao className="mx-auto max-w-md">
        <h2 className="mb-5 text-lg font-semibold text-card-foreground">Requisição de Materiais</h2>
        <form onSubmit={handleSubmit}>
          <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
            Número da PV
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              type="text"
              value={numeroPv}
              onChange={(e) => setNumeroPv(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
            Cliente
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              required
            />
          </label>

          <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
            Quantidade de itens
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              type="number"
              min={1}
              step={1}
              value={quantidadeItens}
              onChange={(e) => setQuantidadeItens(e.target.value)}
              required
            />
          </label>

          <div className="mb-4">
            <span className="mb-1 block text-sm font-medium text-card-foreground">Depósito</span>
            <div className="flex gap-2">
              {DEPOSITOS.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  className={classesBotaoSegmento(deposito === opcao, 'compacto')}
                  onClick={() => setDeposito(opcao)}
                >
                  {rotuloDeposito(opcao)}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <span className="mb-1 block text-sm font-medium text-card-foreground">Urgência</span>
            <div className="flex gap-2">
              {OPCOES_URGENCIA.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  className={classesBotaoSegmentoCor(urgencia === opcao)}
                  style={{
                    background: opcao === 'nao_urgente' ? CORES.nao_urgente : `${CORES[opcao]}22`,
                  }}
                  onClick={() => setUrgencia(opcao)}
                >
                  {rotuloUrgencia(opcao)}
                </button>
              ))}
            </div>
          </div>

          {erro && <p className="mb-3.5 text-sm text-destructive">{erro}</p>}
          {sucesso && <p className="mb-3.5 text-sm text-green-600">{sucesso}</p>}

          <Botao className="w-full" type="submit" disabled={enviando}>
            {enviando ? 'Cadastrando...' : 'Cadastrar Requisição'}
          </Botao>
        </form>
      </Cartao>
    </AppShell>
  )
}
