import { useState } from 'react'
import type { FormEvent } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { Modal } from './ui/Modal'
import { Botao } from './ui/Botao'
import { classesBotaoSegmento } from './ui/BotaoSegmento'
import { supabase } from '../lib/supabaseClient'
import { DEPOSITOS, rotuloDeposito } from '../lib/depositos'
import { rotuloRole } from '../lib/cores'
import type { Deposito, Profile, Role } from '../types/database'

const OPCOES_ROLE: Role[] = ['funcionario', 'lider', 'admin']

interface EditarColaboradorModalProps {
  colaborador: Profile
  onFechar: () => void
  onSalvo: () => void
}

async function extrairMensagemErro(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const corpo = await error.context.json()
      if (typeof corpo?.erro === 'string') return corpo.erro
    } catch {
      // corpo não era JSON válido, cai no fallback abaixo
    }
  }
  if (error instanceof Error) return error.message
  return 'Não foi possível salvar o colaborador.'
}

export function EditarColaboradorModal({ colaborador, onFechar, onSalvo }: EditarColaboradorModalProps) {
  const [nomeCompleto, setNomeCompleto] = useState(colaborador.nome_completo)
  const [email, setEmail] = useState(colaborador.email ?? '')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState<Role>(colaborador.role)
  const [deposito, setDeposito] = useState<Deposito>(colaborador.deposito ?? 'deposito_1')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)
    setSalvando(true)

    const { data, error } = await supabase.functions.invoke('rapid-worker', {
      body: {
        userId: colaborador.id,
        email: email.trim(),
        senha: senha || undefined,
        nome_completo: nomeCompleto.trim(),
        role,
        deposito: role === 'funcionario' ? deposito : null,
      },
    })

    setSalvando(false)

    if (error) {
      setErro(await extrairMensagemErro(error))
      return
    }
    if (data?.erro) {
      setErro(data.erro)
      return
    }

    onSalvo()
  }

  return (
    <Modal titulo={`Editar ${colaborador.nome_completo}`} onFechar={onFechar}>
      <form onSubmit={handleSubmit}>
        <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
          Nome completo
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="text"
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
          E-mail
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
          Nova senha
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="text"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={6}
            placeholder="Deixe em branco para manter a atual"
          />
        </label>

        <div className="mb-4">
          <span className="mb-1 block text-sm font-medium text-card-foreground">Papel</span>
          <div className="flex gap-2">
            {OPCOES_ROLE.map((opcao) => (
              <button
                key={opcao}
                type="button"
                className={classesBotaoSegmento(role === opcao)}
                onClick={() => setRole(opcao)}
              >
                {rotuloRole(opcao)}
              </button>
            ))}
          </div>
        </div>

        {role === 'funcionario' && (
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
        )}

        {erro && <p className="mb-3.5 text-sm text-destructive">{erro}</p>}

        <div className="flex justify-end gap-2">
          <Botao type="button" variante="secundaria" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}
