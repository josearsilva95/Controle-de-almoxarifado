import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { BarChart3, Boxes, ChevronLeft, ChevronRight, ClipboardList, LogOut, Menu, Package, Plus, Ruler, Users, X } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { iniciaisDoNome, rotuloRole } from '../lib/cores'
import { podeAdministrar } from '../lib/permissoes'
import { AlertasEmpilhadeira } from './AlertasEmpilhadeira'
import { AlertaContagemCiclica } from './AlertaContagemCiclica'
import { UsoBancoIndicador } from './UsoBancoIndicador'
import { classesBotao, classesBotaoIcone } from './ui/Botao'
import type { Profile } from '../types/database'

const LINK_MEDICAO_CHAPAS = { to: '/medicao-chapas', label: 'Medição de Chapas', icon: Ruler, fim: false }

const LINKS_ADMIN = [
  { to: '/admin', label: 'Requisições', icon: ClipboardList, fim: true },
  { to: '/admin/colaboradores', label: 'Colaboradores', icon: Users, fim: false },
  { to: '/estoque', label: 'Estoque', icon: Boxes, fim: false },
  { to: '/admin/relatorios', label: 'Relatórios', icon: BarChart3, fim: false },
  LINK_MEDICAO_CHAPAS,
]

function linksPara(profile: Profile): typeof LINKS_ADMIN {
  if (podeAdministrar(profile)) return LINKS_ADMIN

  const links = profile.role === 'funcionario' ? [{ to: '/tarefas', label: 'Minhas Requisições', icon: ClipboardList, fim: true }] : []
  // Estoque só aparece pra quem foi colocado numa equipe de contagem —
  // a própria tela mostra só a contagem, sem catálogo nem atribuição.
  if (profile.equipe_estoque) links.push({ to: '/estoque', label: 'Estoque', icon: Boxes, fim: true })
  // Medição de Chapas é aberta pra qualquer autenticado, independente de papel.
  links.push(LINK_MEDICAO_CHAPAS)
  return links
}

function itemClasse(ativo: boolean): string {
  return `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    ativo ? 'bg-primary text-primary-foreground' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, logout } = useAuth()
  const [recolhida, setRecolhida] = useState(() => localStorage.getItem('sidebar-recolhida') === '1')
  const [menuMobileAberto, setMenuMobileAberto] = useState(false)
  if (!profile) return null

  const links = linksPara(profile)
  const administra = podeAdministrar(profile)

  function alternarRecolhida() {
    setRecolhida((atual) => {
      const novo = !atual
      localStorage.setItem('sidebar-recolhida', novo ? '1' : '0')
      return novo
    })
  }

  return (
    <div className="flex min-h-svh flex-col bg-background md:flex-row">
      {administra && <AlertasEmpilhadeira />}
      {profile.recebe_alerta_ciclo && <AlertaContagemCiclica />}

      {/* Fundo escurecido atrás do menu quando aberto no celular — clicar fecha. */}
      {menuMobileAberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMenuMobileAberto(false)}
        />
      )}

      {/* Navegação lateral — fixa nas telas médias/grandes; no celular é um menu
          que desliza da esquerda (mesma aparência do desktop), aberto pelo botão
          de hambúrguer no cabeçalho. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 py-4 transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:transition-[width] ${
          menuMobileAberto ? 'translate-x-0' : '-translate-x-full'
        } ${recolhida ? 'md:w-16' : 'md:w-60'}`}
      >
        <div className="mb-6 flex items-center justify-between gap-2 px-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="h-5 w-5" />
            </div>
            <div className={recolhida ? 'md:hidden' : ''}>
              <p className="text-sm font-semibold text-white">Controle de Movimentação</p>
              <p className="text-xs text-slate-400">Separação de requisições</p>
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white md:hidden"
            onClick={() => setMenuMobileAberto(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.fim}
                className={({ isActive }) => itemClasse(isActive)}
                title={link.label}
                onClick={() => setMenuMobileAberto(false)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={recolhida ? 'md:hidden' : ''}>{link.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {administra && <UsoBancoIndicador recolhida={recolhida} />}

        <button
          type="button"
          className="mx-3 hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white md:flex"
          onClick={alternarRecolhida}
          title={recolhida ? 'Expandir menu' : 'Recolher menu'}
        >
          {recolhida ? <ChevronRight className="h-4 w-4 shrink-0" /> : <ChevronLeft className="h-4 w-4 shrink-0" />}
          {!recolhida && <span>Recolher menu</span>}
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3 sm:justify-end sm:gap-3 sm:px-6 md:flex-nowrap">
          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <button
              type="button"
              className={classesBotaoIcone()}
              onClick={() => setMenuMobileAberto(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-semibold text-card-foreground sm:inline">Controle de Movimentação</span>
          </div>

          {administra && (
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

        <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  )
}
