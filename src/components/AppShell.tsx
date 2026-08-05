import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { BarChart3, ClipboardList, Package, Users } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { iniciaisDoNome, rotuloRole } from '../lib/cores'
import { AlertasEmpilhadeira } from './AlertasEmpilhadeira'
import { Botao, classesBotao } from './ui/Botao'

const LINKS_ADMIN = [
  { to: '/admin', label: 'Requisições', icon: ClipboardList, fim: true },
  { to: '/admin/colaboradores', label: 'Colaboradores', icon: Users, fim: false },
  { to: '/admin/relatorios', label: 'Relatórios', icon: BarChart3, fim: false },
]

function itemClasse(ativo: boolean): string {
  return `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    ativo ? 'bg-primary text-primary-foreground' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, logout } = useAuth()
  if (!profile) return null

  return (
    <div className="flex min-h-svh bg-background">
      {profile.role === 'admin' && <AlertasEmpilhadeira />}
      <aside className="flex w-16 shrink-0 flex-col border-r border-slate-800 bg-slate-900 py-4 md:w-60">
        <div className="mb-6 flex items-center gap-2 px-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-white">Controle de Movimentação</p>
            <p className="text-xs text-slate-400">Separação de requisições</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {profile.role === 'admin' &&
            LINKS_ADMIN.map((link) => {
              const Icon = link.icon
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.fim}
                  className={({ isActive }) => itemClasse(isActive)}
                  title={link.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">{link.label}</span>
                </NavLink>
              )
            })}
          {profile.role === 'funcionario' && (
            <NavLink to="/tarefas" className={({ isActive }) => itemClasse(isActive)} title="Minhas Requisições">
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">Minhas Requisições</span>
            </NavLink>
          )}
          {profile.role === 'lider' && (
            <NavLink
              to="/lider/desempenho"
              className={({ isActive }) => itemClasse(isActive)}
              title="Desempenho"
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">Desempenho</span>
            </NavLink>
          )}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-border bg-card px-6 py-3">
          {profile.role === 'admin' && (
            <Link to="/admin/nova-requisicao" className={classesBotao('primaria', 'sm')}>
              + Nova Requisição
            </Link>
          )}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {iniciaisDoNome(profile.nome_completo)}
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-card-foreground">{profile.nome_completo}</p>
              <p className="text-xs text-muted-foreground">{rotuloRole(profile.role)}</p>
            </div>
          </div>
          <Botao variante="secundaria" tamanho="sm" onClick={logout}>
            Sair
          </Botao>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  )
}
