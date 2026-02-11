import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Search, Plus, Edit, Trash2, X, Save, Power, PowerOff, UserCog, Unlock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface UnidadeExecutanteOption {
  id: string
  cnes: string
  nome: string
}

interface Usuario {
  id: string
  nome: string
  email: string
  tipo: string
  ativo: boolean
  unidadeId?: string | null
  unidade?: UnidadeExecutanteOption
  unidadeExecutanteId?: string | null
  unidadeExecutante?: UnidadeExecutanteOption
  bloqueadoEm?: string | null
  tentativasLogin?: number
  createdAt: string
  updatedAt: string
}

const TIPOS_PERFIL = [
  { valor: 'ADMIN', label: 'Administrador' },
  { valor: 'AUTORIZADOR', label: 'Autorizador' },
  { valor: 'GESTOR', label: 'Gestor' },
  { valor: 'ATENDENTE', label: 'Atendente' },
  { valor: 'SOLICITANTE', label: 'Solicitante' },
  { valor: 'EXECUTANTE', label: 'Executante' }
]

/** Perfis que o GESTOR pode atribuir (sem ADMIN) */
const TIPOS_PERFIL_GESTOR = TIPOS_PERFIL.filter((t) => t.valor !== 'ADMIN')

export default function Usuarios() {
  const { usuario: usuarioLogado } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | null>(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    tipo: 'ATENDENTE',
    unidadeId: '' as string,
    unidadeExecutanteId: '' as string
  })
  const [unidades, setUnidades] = useState<UnidadeExecutanteOption[]>([])
  const [unidadesExecutantes, setUnidadesExecutantes] = useState<UnidadeExecutanteOption[]>([])
  const [loadingUnidades, setLoadingUnidades] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroApi, setErroApi] = useState<string | null>(null)

  useEffect(() => {
    carregarUsuarios()
  }, [search, filtroTipo, filtroAtivo])

  const carregarUsuarios = async () => {
    setErroApi(null)
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filtroTipo) params.append('tipo', filtroTipo)
      if (filtroAtivo !== null) params.append('ativo', filtroAtivo.toString())

      const response = await api.get(`/usuarios?${params.toString()}`)
      setUsuarios(response.data.usuarios || [])
    } catch (error: any) {
      setUsuarios([])
      if (error.response?.status === 403) {
        setErroApi(null)
      } else {
        console.error('Erro ao carregar usuários:', error)
        const msg = error?.response?.data?.message || error?.message || 'Servidor indisponível.'
        setErroApi(`Não foi possível carregar os usuários. ${msg} Verifique se o backend está rodando (npm run dev ou npm run dev:server).`)
      }
    } finally {
      setLoading(false)
    }
  }

  const abrirModalNovo = () => {
    setEditando(null)
    setForm({ nome: '', email: '', senha: '', tipo: 'ATENDENTE', unidadeId: '', unidadeExecutanteId: '' })
    setErro(null)
    setModalAberto(true)
  }

  const abrirModalEditar = (u: Usuario) => {
    setEditando(u)
    setForm({
      nome: u.nome,
      email: u.email,
      senha: '',
      tipo: u.tipo,
      unidadeId: u.unidadeId ?? '',
      unidadeExecutanteId: u.unidadeExecutanteId ?? ''
    })
    setErro(null)
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setEditando(null)
    setForm({ nome: '', email: '', senha: '', tipo: 'ATENDENTE', unidadeId: '', unidadeExecutanteId: '' })
    setErro(null)
  }

  useEffect(() => {
    if (!modalAberto) return
    let cancelled = false
    setLoadingUnidades(true)
    Promise.all([
      api.get('/unidades?ativo=true'),
      api.get('/unidades-executantes?ativo=true')
    ])
      .then(([resUnidades, resExecutantes]) => {
        if (!cancelled) {
          setUnidades(Array.isArray(resUnidades.data) ? resUnidades.data : [])
          setUnidadesExecutantes(Array.isArray(resExecutantes.data) ? resExecutantes.data : [])
        }
      })
      .catch(() => { if (!cancelled) { setUnidades([]); setUnidadesExecutantes([]) } })
      .finally(() => { if (!cancelled) setLoadingUnidades(false) })
    return () => { cancelled = true }
  }, [modalAberto])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setSubmitting(true)

    try {
      if (!form.nome.trim() || !form.email.trim()) {
        setErro('Nome e e-mail são obrigatórios.')
        setSubmitting(false)
        return
      }

      if (!editando && !form.senha.trim()) {
        setErro('A senha é obrigatória para novo usuário.')
        setSubmitting(false)
        return
      }

      if (form.senha && form.senha.length < 6) {
        setErro('A senha deve ter no mínimo 6 caracteres.')
        setSubmitting(false)
        return
      }

      const basePayload = {
        nome: form.nome.trim(),
        email: form.email.trim(),
        tipo: form.tipo,
        unidadeId: form.unidadeId.trim() || null,
        unidadeExecutanteId: form.tipo === 'EXECUTANTE' ? (form.unidadeExecutanteId.trim() || null) : null
      }
      if (editando) {
        const payload: any = { ...basePayload }
        if (form.senha.trim()) payload.senha = form.senha
        await api.patch(`/usuarios/${editando.id}`, payload)
      } else {
        const createPayload: any = { ...basePayload, senha: form.senha }
        await api.post('/usuarios', createPayload)
      }

      fecharModal()
      carregarUsuarios()
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao salvar usuário.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleAtivo = async (u: Usuario) => {
    if (u.id === usuarioLogado?.id) {
      alert('Não é possível inativar o próprio usuário.')
      return
    }
    const acao = u.ativo ? 'inativar' : 'ativar'
    if (!window.confirm(`Tem certeza que deseja ${acao} este usuário?`)) return

    try {
      await api.patch(`/usuarios/${u.id}`, { ativo: !u.ativo })
      carregarUsuarios()
    } catch (error: any) {
      alert(error.response?.data?.message || `Erro ao ${acao} usuário.`)
    }
  }

  const handleDesbloquear = async (u: Usuario) => {
    if (!window.confirm(`Deseja desbloquear o usuário ${u.nome}?`)) return

    try {
      await api.post(`/usuarios/${u.id}/desbloquear`)
      carregarUsuarios()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao desbloquear usuário.')
    }
  }

  const handleExcluir = async (id: string) => {
    if (id === usuarioLogado?.id) {
      alert('Não é possível excluir o próprio usuário.')
      return
    }
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return

    try {
      await api.delete(`/usuarios/${id}`)
      carregarUsuarios()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao excluir usuário.')
    }
  }

  const getTipoLabel = (tipo: string) => {
    return TIPOS_PERFIL.find((t) => t.valor === tipo)?.label || tipo
  }

  const tiposPermitidosNoForm = usuarioLogado?.tipo === 'GESTOR' ? TIPOS_PERFIL_GESTOR : TIPOS_PERFIL
  const podeEditarUsuario = (u: Usuario) => usuarioLogado?.tipo !== 'GESTOR' || u.tipo !== 'ADMIN'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Usuários e Perfis</h1>
          <p className="text-gray-600 mt-1">Cadastro de usuários e perfis de uso do sistema</p>
          {usuarioLogado?.tipo === 'GESTOR' && (
            <p className="text-amber-700 text-sm mt-1 bg-amber-50 px-2 py-1 rounded inline-block">
              Como gestor, você não pode criar, editar ou excluir usuários com perfil Administrador.
            </p>
          )}
        </div>
        <button
          onClick={abrirModalNovo}
          className="bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 flex items-center gap-2 font-semibold transform active:scale-95"
        >
          <div className="bg-white/20 p-1 rounded-lg">
            <Plus size={18} />
          </div>
          Novo Usuário
        </button>
      </div>

      {erroApi && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          {erroApi}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none text-slate-700"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFiltroTipo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os perfis</option>
            {(usuarioLogado?.tipo === 'GESTOR' ? TIPOS_PERFIL_GESTOR : TIPOS_PERFIL).map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={filtroAtivo === null ? 'todos' : filtroAtivo ? 'ativos' : 'inativos'}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const v = e.target.value
              setFiltroAtivo(v === 'todos' ? null : v === 'ativos')
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="todos">Todos</option>
            <option value="ativos">Apenas Ativos</option>
            <option value="inativos">Apenas Inativos</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Perfil</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Unidade</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                usuarios.map((u: Usuario) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 leading-none mb-1">{u.nome}</span>
                        <span className="text-xs text-slate-400 font-medium">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-primary-50 text-primary-700 border border-primary-100">
                        {getTipoLabel(u.tipo)}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="text-sm text-slate-600 font-medium">
                        {u.unidade ? u.unidade.nome : '—'}
                      </span>
                      {u.unidade && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{u.unidade.cnes}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 text-xs rounded-full inline-block w-fit ${u.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                        {u.bloqueadoEm && (
                          <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 inline-block w-fit">
                            Bloqueado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => abrirModalEditar(u)}
                          disabled={!podeEditarUsuario(u)}
                          className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all disabled:opacity-30"
                          title="Editar perfil"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleAtivo(u)}
                          disabled={u.id === usuarioLogado?.id || !podeEditarUsuario(u)}
                          className={`p-2 rounded-xl transition-all disabled:opacity-30 ${u.ativo ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                          title={u.ativo ? 'Suspensão temporária' : 'Reativar acesso'}
                        >
                          {u.ativo ? <PowerOff size={18} /> : <Power size={18} />}
                        </button>
                        {u.bloqueadoEm && (
                          <button
                            onClick={() => handleDesbloquear(u)}
                            disabled={!podeEditarUsuario(u)}
                            className="p-2 text-amber-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all animate-bounce-subtle"
                            title="Liberar acesso bloqueado"
                          >
                            <Unlock size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleExcluir(u.id)}
                          disabled={u.id === usuarioLogado?.id || !podeEditarUsuario(u)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-30"
                          title="Remover permanentemente"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastro/Edição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <UserCog size={22} />
                {editando ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button onClick={fecharModal} className="p-2 hover:bg-gray-100 rounded-lg" disabled={submitting}>
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {erro && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{erro}</p>
                </div>
              )}

              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nome"
                  value={form.nome}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: João Silva"
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={form.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="exemplo@email.com"
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {editando ? '(deixe em branco para manter)' : <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  id="senha"
                  value={form.senha}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, senha: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder={editando ? '••••••••' : 'Mínimo 6 caracteres'}
                  disabled={submitting}
                  minLength={editando ? 0 : 6}
                />
              </div>

              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil <span className="text-red-500">*</span>
                </label>
                <select
                  id="tipo"
                  value={form.tipo}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  disabled={submitting}
                  required
                >
                  {tiposPermitidosNoForm.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {form.tipo === 'AUTORIZADOR' && 'Autorizador: registro de APAC e cadastro de profissionais autorizadores'}
                  {form.tipo === 'EXECUTANTE' && 'Executante: registro de procedimentos executados nas solicitações'}
                  {form.tipo === 'SOLICITANTE' && 'Solicitante: criação e acompanhamento de solicitações OCI'}
                  {!['AUTORIZADOR', 'EXECUTANTE', 'SOLICITANTE'].includes(form.tipo) && 'Administrador, Gestor e Atendente: gestão completa ou parcial conforme o perfil'}
                </p>
              </div>

              <div>
                <label htmlFor="unidadeId" className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade (lotação)
                </label>
                <select
                  id="unidadeId"
                  value={form.unidadeId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, unidadeId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  disabled={submitting || loadingUnidades}
                >
                  <option value="">Nenhuma</option>
                  {unidades.map((u: UnidadeExecutanteOption) => (
                    <option key={u.id} value={u.id}>
                      {u.cnes} - {u.nome}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Unidade de saúde à qual o usuário está vinculado (opcional)</p>
              </div>

              {form.tipo === 'EXECUTANTE' && (
                <div>
                  <label htmlFor="unidadeExecutanteId" className="block text-sm font-medium text-gray-700 mb-1">
                    Unidade executante
                  </label>
                  <select
                    id="unidadeExecutanteId"
                    value={form.unidadeExecutanteId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, unidadeExecutanteId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    disabled={submitting || loadingUnidades}
                  >
                    <option value="">Nenhuma (só vê agendamentos atribuídos a ele)</option>
                    {unidadesExecutantes.map((u: UnidadeExecutanteOption) => (
                      <option key={u.id} value={u.id}>
                        {u.cnes} - {u.nome}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Se vinculado, o executante verá todas as solicitações com procedimentos agendados nessa unidade.</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {editando ? 'Salvar' : 'Cadastrar'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
