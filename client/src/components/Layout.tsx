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
  History as HistoryIcon,
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
            ...(usuario?.tipo === 'ADMIN' ? [{ path: '/auditoria', label: 'Histórico e Auditoria', icon: HistoryIcon }] : []),
            ...(usuario?.tipo === 'ADMIN' || usuario?.tipo === 'GESTOR' ? [{ path: '/usuarios', label: 'Usuários e Perfis', icon: UserCog }] : [])
          ]

  const fecharSidebar = () => setSidebarAberta(false)

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary-100 selection:text-primary-900">
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
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 print:hidden ${sidebarAberta ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        <div className="p-6 h-24 flex items-center justify-between border-b border-slate-100 bg-white">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent leading-none">
              OCI
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">
              Gestão Municipal
            </p>
          </div>
          <button
            type="button"
            onClick={fecharSidebar}
            className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
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
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1.5 transition-all duration-200 group ${isActive
                  ? 'bg-primary-50 text-primary-700 shadow-sm shadow-primary-100/50'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                  }`}>
                  <Icon size={18} />
                </div>
                <span className={`text-[15px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white/80 backdrop-blur-sm">
          <div className="mb-4 px-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border border-primary-200">
              {usuario?.nome?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{usuario?.nome}</p>
              <p className="text-[11px] text-slate-400 truncate uppercase font-bold tracking-wider">{usuario?.tipo}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all font-semibold text-sm border border-transparent hover:border-red-100"
          >
            <LogOut size={16} />
            <span>Sair do sistema</span>
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
