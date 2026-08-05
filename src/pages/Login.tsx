import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { rotaInicialPara } from '../lib/rotas'

export function Login() {
  const { session, profile, carregando, login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!carregando && session && profile) {
    return <Navigate to={rotaInicialPara(profile.role)} replace />
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    const { erro } = await login(email, senha)
    setEnviando(false)
    if (erro) setErro(erro)
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <form
        className="w-full max-w-sm rounded-xl border border-border bg-card p-7 shadow-sm"
        onSubmit={handleSubmit}
      >
        <h1 className="mb-6 text-center text-xl font-semibold text-card-foreground">
          Controle de Movimentação
        </h1>
        <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
          E-mail
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
        </label>
        <label className="mb-3.5 flex flex-col gap-1 text-sm font-medium text-card-foreground">
          Senha
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>
        {erro && <p className="mb-3.5 text-sm text-destructive">{erro}</p>}
        <button
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          type="submit"
          disabled={enviando}
        >
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
