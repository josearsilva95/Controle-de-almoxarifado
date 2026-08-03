import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const LINKS_ADMIN = [
  { to: '/admin', label: 'Requisições', fim: true },
  { to: '/admin/nova-requisicao', label: 'Nova Requisição', fim: false },
  { to: '/admin/colaboradores', label: 'Colaboradores', fim: false },
  { to: '/admin/relatorios', label: 'Relatórios', fim: false },
]

function linkClasse(ativo: boolean): string {
  return `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    ativo ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
  }`
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, logout } = useAuth()
  if (!profile) return null

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-base font-semibold text-card-foreground">Controle de Movimentação</h1>
          {profile.role === 'admin' && (
            <nav className="flex flex-wrap gap-1">
              {LINKS_ADMIN.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.fim}
                  className={({ isActive }) => linkClasse(isActive)}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{profile.nome_completo}</span>
          <button
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-card-foreground hover:bg-muted"
            onClick={logout}
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">{children}</main>
    </div>
  )
}
