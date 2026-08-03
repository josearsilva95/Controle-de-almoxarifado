import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RotaProtegida } from './auth/RotaProtegida'
import { Login } from './pages/Login'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminCadastrarPV } from './pages/AdminCadastrarPV'
import { FuncionarioTarefas } from './pages/FuncionarioTarefas'

export function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <RotaProtegida role="admin">
                <AdminDashboard />
              </RotaProtegida>
            }
          />
          <Route
            path="/admin/nova-pv"
            element={
              <RotaProtegida role="admin">
                <AdminCadastrarPV />
              </RotaProtegida>
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
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
