import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { BarChart3, ClipboardList, LogOut, Package, Plus, Users } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { iniciaisDoNome, rotuloRole } from '../lib/cores'
import { AlertasEmpilhadeira } from './AlertasEmpilhadeira'
import { classesBotao, classesBotaoIcone } from './ui/Botao'

const LINKS_ADMIN = [
  { to: '/admin', label: 'Requisições', icon: ClipboardList, fim: true },
  { to: '/admin/colaboradores', label: 'Colaboradores', icon: Users, fim: false },
  { to: '/admin/relatorios', label: 'Relatórios', icon: BarChart3, fim: false },
]

function linksPara(role: string): typeof LINKS_ADMIN {
  if (role === 'admin') return LINKS_ADMIN
  if (role === 'funcionario') return [{ to: '/tarefas', label: 'Minhas Requisições', icon: ClipboardList, fim: true }]
  if (role === 'lider') return [{ to: '/lider/desempenho', label: 'Desempenho', icon: BarChart3, fim: true }]
  return []
}

function itemClasse(ativo: boolean): string {
  return `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    ativo ? 'bg-primary text-primary-foreground' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`
}

function itemClasseMobile(ativo: boolean): string {
  return `flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-[11px] font-medium transition-colors ${
    ativo ? 'text-primary' : 'text-muted-foreground'
  }`
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, logout } = useAuth()
  if (!profile) return null

  const links = linksPara(profile.role)

  return (
    <div className="flex min-h-svh flex-col bg-background md:flex-row">
      {profile.role === 'admin' && <AlertasEmpilhadeira />}

      {/* Navegação lateral — só em telas médias/grandes; no celular vira a barra inferior. */}
      <aside className="hidden w-16 shrink-0 flex-col border-r border-slate-800 bg-slate-900 py-4 md:flex md:w-60">
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
          {links.map((link) => {
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
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3 sm:justify-end sm:gap-3 sm:px-6 md:flex-nowrap">
          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-semibold text-card-foreground sm:inline">Controle de Movimentação</span>
          </div>

          {profile.role === 'admin' && (
            <Link to="/admin/nova-requisicao" className={classesBotao('primaria', 'sm')} aria-label="Nova Requisição">
              <Plus className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">+ Nova Requisição</span>
            </Link>
          )}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {iniciaisDoNome(profile.nome_completo)}
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-card-foreground">{profile.nome_completo}</p>
              <p className="text-xs text-muted-foreground">{rotuloRole(profile.role)}</p>
            </div>
          </div>
          <button
            type="button"
            className={`${classesBotaoIcone()} sm:hidden`}
            onClick={logout}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={`${classesBotao('secundaria', 'sm')} hidden sm:inline-flex`}
            onClick={logout}
          >
            Sair
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 sm:px-6 sm:py-6 md:pb-6">{children}</main>
      </div>

      {/* Barra de navegação inferior — só no celular (a lateral cobre telas maiores). */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-card px-1 py-1 md:hidden">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <NavLink key={link.to} to={link.to} end={link.fim} className={({ isActive }) => itemClasseMobile(isActive)}>
              <Icon className="h-5 w-5" />
              <span className="text-center leading-tight">{link.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
