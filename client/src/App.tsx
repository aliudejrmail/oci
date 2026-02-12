import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Solicitacoes from './pages/Solicitacoes'
import SolicitacaoDetalhes from './pages/SolicitacaoDetalhes'
import Pacientes from './pages/Pacientes'
import Profissionais from './pages/Profissionais'
import OCIs from './pages/OCIs'
import UnidadesExecutantes from './pages/UnidadesExecutantes'
import Usuarios from './pages/Usuarios'
import Relatorios from './pages/Relatorios'
import ImportarSigtap from './pages/ImportarSigtap'
import Auditoria from './pages/Auditoria'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

/** Redireciona raiz (/) para /solicitacoes se EXECUTANTE, senão /dashboard */
function RedirectPorPerfil() {
  const { usuario } = useAuth()
  return <Navigate to={usuario?.tipo === 'EXECUTANTE' ? '/solicitacoes' : '/dashboard'} replace />
}

/** Exibe Dashboard ou redireciona EXECUTANTE para /solicitacoes */
function DashboardOuRedirect() {
  const { usuario } = useAuth()
  if (usuario?.tipo === 'EXECUTANTE') return <Navigate to="/solicitacoes" replace />
  return <Dashboard />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RedirectPorPerfil />} />
            <Route path="dashboard" element={<DashboardOuRedirect />} />
            <Route path="solicitacoes" element={<Solicitacoes />} />
            <Route path="solicitacoes/:id" element={<SolicitacaoDetalhes />} />
            <Route path="pacientes" element={<Pacientes />} />
            <Route path="profissionais" element={
              <ProtectedRoute roles={['ADMIN', 'GESTOR', 'AUTORIZADOR']}>
                <Profissionais />
              </ProtectedRoute>
            } />
            <Route path="ocis" element={
              <ProtectedRoute roles={['ADMIN', 'GESTOR']}>
                <OCIs />
              </ProtectedRoute>
            } />
            <Route path="unidades-executantes" element={
              <ProtectedRoute roles={['ADMIN', 'GESTOR']}>
                <UnidadesExecutantes />
              </ProtectedRoute>
            } />
            <Route path="relatorios" element={
              <ProtectedRoute roles={['ADMIN', 'GESTOR']}>
                <Relatorios />
              </ProtectedRoute>
            } />
            <Route path="importar-sigtap" element={
              <ProtectedRoute roles={['ADMIN']}>
                <ImportarSigtap />
              </ProtectedRoute>
            } />
            <Route path="usuarios" element={
              <ProtectedRoute roles={['ADMIN', 'GESTOR']}>
                <Usuarios />
              </ProtectedRoute>
            } />
            <Route path="auditoria" element={
              <ProtectedRoute roles={['ADMIN']}>
                <Auditoria />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
