import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { AppShell } from '../components/AppShell'
import { Cartao } from '../components/ui/Cartao'
import type { Role } from '../types/database'

const OPCOES_ROLE: Role[] = ['funcionario', 'admin']

function gerarSenhaAleatoria(): string {
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const valores = crypto.getRandomValues(new Uint32Array(10))
  return Array.from(valores, (v) => alfabeto[v % alfabeto.length]).join('')
}

export function AdminNovoColaborador() {
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState<Role>('funcionario')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<{ email: string; senha: string } | null>(null)

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)
    setSucesso(null)
    setEnviando(true)

    const { data, error } = await supabase.functions.invoke('rapid-worker', {
      body: { email: email.trim(), senha, nome_completo: nomeCompleto.trim(), role },
    })

    setEnviando(false)

    if (error) {
      setErro(error.message || 'Não foi possível criar o colaborador.')
      return
    }
    if (data?.erro) {
      setErro(data.erro)
      return
    }

    setSucesso({ email: email.trim(), senha })
    setNomeCompleto('')
    setEmail('')
    setSenha('')
    setRole('funcionario')
  }

  return (
    <AppShell>
      <div className="mb-4">
        <Link to="/admin/colaboradores" className="text-sm text-primary hover:underline">
          ← Voltar a colaboradores
        </Link>
      </div>

      <Cartao className="mx-auto max-w-md">
        <h2 className="mb-5 text-lg font-semibold text-card-foreground">Novo Colaborador</h2>
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

          <div className="mb-3.5">
            <span className="mb-1 block text-sm font-medium text-card-foreground">Senha</span>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                type="text"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="button"
                className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground hover:bg-muted"
                onClick={() => setSenha(gerarSenhaAleatoria())}
              >
                Gerar
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Mínimo 6 caracteres. Anote para repassar ao colaborador — não há e-mail de confirmação.
            </p>
          </div>

          <div className="mb-4">
            <span className="mb-1 block text-sm font-medium text-card-foreground">Papel</span>
            <div className="flex gap-2">
              {OPCOES_ROLE.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  className={`flex-1 rounded-md border-2 px-3 py-2 text-sm font-medium transition-colors ${
                    role === opcao
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                  onClick={() => setRole(opcao)}
                >
                  {opcao === 'admin' ? 'Administrador' : 'Almoxarife'}
                </button>
              ))}
            </div>
          </div>

          {erro && <p className="mb-3.5 text-sm text-destructive">{erro}</p>}
          {sucesso && (
            <div className="mb-3.5 rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
              <p className="font-medium">Colaborador criado com sucesso!</p>
              <p>
                Repasse estas credenciais: <strong>{sucesso.email}</strong> / <strong>{sucesso.senha}</strong>
              </p>
            </div>
          )}

          <button
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            type="submit"
            disabled={enviando}
          >
            {enviando ? 'Criando...' : 'Criar Colaborador'}
          </button>
        </form>
      </Cartao>
    </AppShell>
  )
}
