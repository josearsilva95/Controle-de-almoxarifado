import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RotaProtegida } from './auth/RotaProtegida'
import { RotaAdmin } from './auth/RotaAdmin'
import { RotaEstoque } from './auth/RotaEstoque'
import { RotaAutenticada } from './auth/RotaAutenticada'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PedidosProvider } from './hooks/PedidosProvider'
import { EstoqueCiclosProvider } from './hooks/EstoqueCiclosProvider'
import { Login } from './pages/Login'

// Cada página só baixa/executa quando a rota é de fato visitada, em vez de
// tudo junto no primeiro carregamento — sem isso, até a tela de login
// precisava esperar o bundle inteiro (Medição de Chapas + jspdf + xlsx +
// zxing) baixar e rodar antes de aparecer, o que trava/não abre em celular
// mais fraco. Comportamento de cada página não muda em nada, só quando o
// código dela é buscado.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const AdminCadastrarPV = lazy(() => import('./pages/AdminCadastrarPV').then((m) => ({ default: m.AdminCadastrarPV })))
const AdminColaboradores = lazy(() => import('./pages/AdminColaboradores').then((m) => ({ default: m.AdminColaboradores })))
const AdminNovoColaborador = lazy(() => import('./pages/AdminNovoColaborador').then((m) => ({ default: m.AdminNovoColaborador })))
const AdminRelatorios = lazy(() => import('./pages/AdminRelatorios').then((m) => ({ default: m.AdminRelatorios })))
const AdminEstoque = lazy(() => import('./pages/AdminEstoque').then((m) => ({ default: m.AdminEstoque })))
const MedicaoChapas = lazy(() => import('./pages/MedicaoChapas').then((m) => ({ default: m.MedicaoChapas })))
const FuncionarioTarefas = lazy(() => import('./pages/FuncionarioTarefas').then((m) => ({ default: m.FuncionarioTarefas })))

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <PedidosProvider>
          <EstoqueCiclosProvider>
            <Suspense fallback={null}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/admin"
                element={
                  <RotaAdmin>
                    <AdminDashboard />
                  </RotaAdmin>
                }
              />
              <Route
                path="/admin/nova-requisicao"
                element={
                  <RotaAdmin>
                    <AdminCadastrarPV />
                  </RotaAdmin>
                }
              />
              <Route
                path="/admin/colaboradores"
                element={
                  <RotaAdmin>
                    <AdminColaboradores />
                  </RotaAdmin>
                }
              />
              <Route
                path="/admin/novo-colaborador"
                element={
                  <RotaAdmin>
                    <AdminNovoColaborador />
                  </RotaAdmin>
                }
              />
              <Route
                path="/admin/relatorios"
                element={
                  <RotaAdmin>
                    <AdminRelatorios />
                  </RotaAdmin>
                }
              />
              <Route
                path="/estoque"
                element={
                  <RotaEstoque>
                    <AdminEstoque />
                  </RotaEstoque>
                }
              />
              <Route
                path="/tarefas"
                element={
                  <RotaProtegida role="funcionario">
                    <FuncionarioTarefas />
                  </RotaProtegida>
                }
              />
              <Route
                path="/medicao-chapas"
                element={
                  <RotaAutenticada>
                    <MedicaoChapas />
                  </RotaAutenticada>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            </Suspense>
          </EstoqueCiclosProvider>
          </PedidosProvider>
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
