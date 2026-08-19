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
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminCadastrarPV } from './pages/AdminCadastrarPV'
import { AdminColaboradores } from './pages/AdminColaboradores'
import { AdminNovoColaborador } from './pages/AdminNovoColaborador'
import { AdminRelatorios } from './pages/AdminRelatorios'
import { AdminEstoque } from './pages/AdminEstoque'
import { MedicaoChapas } from './pages/MedicaoChapas'
import { FuncionarioTarefas } from './pages/FuncionarioTarefas'

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <PedidosProvider>
          <EstoqueCiclosProvider>
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
          </EstoqueCiclosProvider>
          </PedidosProvider>
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
