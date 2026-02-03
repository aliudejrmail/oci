import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Package, 
  LogOut,
  UserCheck,
  UserCog,
  Building2,
  BarChart3,
  FileArchive,
  Menu,
  X
} from 'lucide-react'

export default function Layout() {
  const { usuario, logout } = useAuth()
  const location = useLocation()
  const [sidebarAberta, setSidebarAberta] = useState(false)

  // Menu base: todos os perfis
  const menuBase = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/solicitacoes', label: 'Solicitações', icon: FileText },
  ]

  // Autorizador: Dashboard, Solicitações e Profissionais
  const menuAutorizador = [
    ...menuBase,
    { path: '/profissionais', label: 'Profissionais', icon: UserCheck },
  ]

  // Solicitante: Dashboard, Solicitações e Pacientes (criação e acompanhamento de solicitações)
  const menuSolicitante = [
    ...menuBase,
    { path: '/pacientes', label: 'Pacientes', icon: Users },
  ]

  // Executante: apenas Solicitações (solicitações agendadas para este executante)
  const menuExecutante = [{ path: '/solicitacoes', label: 'Solicitações', icon: FileText }]

  // ATENDENTE: Dashboard, Solicitações e Pacientes
  const menuAtendente = [
    ...menuBase,
    { path: '/pacientes', label: 'Pacientes', icon: Users },
  ]

  // ADMIN e GESTOR: menu completo
  const menuCompleto = [
    ...menuBase,
    { path: '/pacientes', label: 'Pacientes', icon: Users },
    { path: '/profissionais', label: 'Profissionais', icon: UserCheck },
    { path: '/unidades-executantes', label: 'Unidades (Executantes/Solicitantes)', icon: Building2 },
    { path: '/ocis', label: 'OCIs', icon: Package },
    { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  ]

  const menuItems = usuario?.tipo === 'AUTORIZADOR'
    ? menuAutorizador
    : usuario?.tipo === 'SOLICITANTE'
    ? menuSolicitante
    : usuario?.tipo === 'EXECUTANTE'
    ? menuExecutante
    : usuario?.tipo === 'ATENDENTE'
    ? menuAtendente
    : [
        ...menuCompleto,
        ...(usuario?.tipo === 'ADMIN' ? [{ path: '/importar-sigtap', label: 'Importar SIGTAP', icon: FileArchive }] : []),
        ...(usuario?.tipo === 'ADMIN' || usuario?.tipo === 'GESTOR' ? [{ path: '/usuarios', label: 'Usuários e Perfis', icon: UserCog }] : [])
      ]

  const fecharSidebar = () => setSidebarAberta(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Overlay mobile - fecha sidebar ao clicar fora */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity print:hidden ${sidebarAberta ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={fecharSidebar}
        aria-hidden="true"
      />

      {/* Botão hambúrguer - visível só em mobile */}
      <button
        type="button"
        onClick={() => setSidebarAberta(true)}
        className="fixed top-4 left-4 z-30 md:hidden p-2 rounded-lg bg-white shadow-md text-gray-700 hover:bg-gray-100 print:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-200 ease-out md:translate-x-0 print:hidden ${
          sidebarAberta ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary-600 leading-tight">
              Sec. Municipal de Saúde
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Prefeitura de Parauapebas
            </p>
          </div>
          <button
            type="button"
            onClick={fecharSidebar}
            className="md:hidden p-2 -mr-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || 
                           (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={fecharSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <div className="mb-3 px-4">
            <p className="text-sm font-medium text-gray-900 truncate">{usuario?.nome}</p>
            <p className="text-xs text-gray-500 truncate">{usuario?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-4 pt-16 md:pt-8 md:p-8 min-h-screen print:ml-0 print:pt-4 print:p-4">
        <Outlet />
      </main>
    </div>
  )
}
