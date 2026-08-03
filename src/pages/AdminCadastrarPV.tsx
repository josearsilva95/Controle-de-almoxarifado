import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabaseClient'
import { CORES, rotuloUrgencia } from '../lib/cores'
import type { Urgencia } from '../types/database'

const OPCOES_URGENCIA: Urgencia[] = ['urgente', 'medio', 'nao_urgente']

export function AdminCadastrarPV() {
  const { profile, logout } = useAuth()
  const [numeroPv, setNumeroPv] = useState('')
  const [cliente, setCliente] = useState('')
  const [urgencia, setUrgencia] = useState<Urgencia>('nao_urgente')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  if (!profile) return null

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)
    setSucesso(null)
    setEnviando(true)

    const { error } = await supabase.from('pedidos').insert({
      numero_pv: numeroPv.trim(),
      cliente: cliente.trim(),
      urgencia,
      criado_por: profile!.id,
    })

    setEnviando(false)
    if (error) {
      setErro(`Não foi possível cadastrar a PV: ${error.message}`)
      return
    }
    setSucesso(`PV ${numeroPv} cadastrada com sucesso.`)
    setNumeroPv('')
    setCliente('')
    setUrgencia('nao_urgente')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Controle de Movimentação — Cadastrar PV</h1>
        <div className="topbar-info">
          <span>{profile.nome_completo}</span>
          <button className="secundario" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <main className="conteudo">
        <div className="barra-acoes">
          <Link to="/admin">← Voltar ao painel</Link>
        </div>

        <form className="form-pv" onSubmit={handleSubmit}>
          <label>
            Número da PV
            <input
              type="text"
              value={numeroPv}
              onChange={(e) => setNumeroPv(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label>
            Cliente
            <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} required />
          </label>

          <label>
            Urgência
            <div className="opcoes-urgencia">
              {OPCOES_URGENCIA.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  className={`opcao-urgencia${urgencia === opcao ? ' selecionada' : ''}`}
                  style={{
                    background: opcao === 'nao_urgente' ? CORES.nao_urgente : `${CORES[opcao]}22`,
                    color: '#333',
                  }}
                  onClick={() => setUrgencia(opcao)}
                >
                  {rotuloUrgencia(opcao)}
                </button>
              ))}
            </div>
          </label>

          {erro && <p className="mensagem-erro">{erro}</p>}
          {sucesso && <p className="mensagem-sucesso">{sucesso}</p>}

          <button type="submit" disabled={enviando}>
            {enviando ? 'Cadastrando...' : 'Cadastrar PV'}
          </button>
        </form>
      </main>
    </div>
  )
}
