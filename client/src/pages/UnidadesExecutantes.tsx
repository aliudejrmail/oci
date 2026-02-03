import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Search, Plus, Edit, Trash2, X, Save, Building2 } from 'lucide-react'

interface UnidadeExecutante {
  id: string
  cnes: string
  nome: string
  ativo: boolean
  executante?: number
  solicitante?: number
  createdAt: string
  updatedAt: string
}

export default function UnidadesExecutantes() {
  const [unidades, setUnidades] = useState<UnidadeExecutante[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | null>(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<UnidadeExecutante | null>(null)
  const [form, setForm] = useState({ cnes: '', nome: '', executante: true, solicitante: false })
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroApi, setErroApi] = useState<string | null>(null)

  useEffect(() => {
    carregarUnidades()
  }, [search, filtroAtivo])

  const carregarUnidades = async () => {
    setErroApi(null)
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filtroAtivo !== null) params.append('ativo', filtroAtivo.toString())
      const response = await api.get(`/unidades-executantes?${params.toString()}`)
      setUnidades(Array.isArray(response.data) ? response.data : [])
    } catch (error: any) {
      console.error('Erro ao carregar unidades executantes:', error)
      setUnidades([])
      const msg = error?.response?.data?.message || error?.message || 'Servidor indisponível.'
      setErroApi(`Não foi possível carregar as unidades executantes. ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const abrirModalNovo = () => {
    setEditando(null)
    setForm({ cnes: '', nome: '', executante: true, solicitante: false })
    setErro(null)
    setModalAberto(true)
  }

  const abrirModalEditar = (u: UnidadeExecutante) => {
    setEditando(u)
    setForm({
      cnes: u.cnes,
      nome: u.nome,
      executante: (u.executante ?? 1) === 1,
      solicitante: (u.solicitante ?? 0) === 1
    })
    setErro(null)
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setEditando(null)
    setForm({ cnes: '', nome: '', executante: true, solicitante: false })
    setErro(null)
  }

  const handleCnesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 7)
    setForm({ ...form, cnes: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setSubmitting(true)
    try {
      if (!form.cnes.trim() || !form.nome.trim()) {
        setErro('CNES e Nome do Estabelecimento de Saúde são obrigatórios.')
        setSubmitting(false)
        return
      }
      if (!form.executante && !form.solicitante) {
        setErro('Marque pelo menos uma opção: Unidade executante ou Unidade solicitante.')
        setSubmitting(false)
        return
      }
      const payload = {
        cnes: form.cnes.trim(),
        nome: form.nome.trim(),
        executante: form.executante ? 1 : 0,
        solicitante: form.solicitante ? 1 : 0
      }
      if (editando) {
        await api.patch(`/unidades-executantes/${editando.id}`, payload)
      } else {
        await api.post('/unidades-executantes', payload)
      }
      fecharModal()
      carregarUnidades()
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao salvar unidade executante.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta unidade da lista (deixará de ser executante e solicitante)?')) return
    try {
      await api.delete(`/unidades-executantes/${id}`)
      carregarUnidades()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao excluir unidade executante.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Unidades Executantes e Solicitantes</h1>
          <p className="text-gray-600 mt-1">Cadastro de estabelecimentos de saúde (CNES, nome e papéis: executante e/ou solicitante)</p>
        </div>
        <button
          onClick={abrirModalNovo}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Nova Unidade
        </button>
      </div>

      {erroApi && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          {erroApi}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por CNES ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={filtroAtivo === null ? 'todos' : filtroAtivo ? 'ativos' : 'inativos'}
            onChange={(e) => setFiltroAtivo(e.target.value === 'todos' ? null : e.target.value === 'ativos')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="todos">Todos</option>
            <option value="ativos">Apenas Ativos</option>
            <option value="inativos">Apenas Inativos</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNES</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome do Estabelecimento de Saúde</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Executante</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solicitante</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {unidades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma unidade encontrada
                  </td>
                </tr>
              ) : (
                unidades.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.cnes}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{u.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${(u.executante ?? 1) === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                        {(u.executante ?? 1) === 1 ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${(u.solicitante ?? 0) === 1 ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-600'}`}>
                        {(u.solicitante ?? 0) === 1 ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${u.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => abrirModalEditar(u)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleExcluir(u.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
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

      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 size={22} />
                {editando ? 'Editar Unidade' : 'Nova Unidade'}
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
                <label htmlFor="cnes" className="block text-sm font-medium text-gray-700 mb-1">
                  CNES <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="cnes"
                  value={form.cnes}
                  onChange={handleCnesChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Ex: 1234567"
                  maxLength={7}
                  disabled={submitting}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Código do estabelecimento no Cadastro Nacional de Estabelecimentos de Saúde</p>
              </div>
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Estabelecimento de Saúde <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Ex: UBS Centro"
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700">Papéis da unidade</p>
                <p className="text-xs text-gray-500">Marque um ou os dois conforme o uso da unidade.</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.executante}
                    onChange={(e) => setForm({ ...form, executante: e.target.checked })}
                    disabled={submitting}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Unidade executante</span>
                </label>
                <p className="text-xs text-gray-500 ml-6">Pode receber agendamento de procedimentos (consulta, exames, etc.)</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.solicitante}
                    onChange={(e) => setForm({ ...form, solicitante: e.target.checked })}
                    disabled={submitting}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Unidade solicitante</span>
                </label>
                <p className="text-xs text-gray-500 ml-6">Pode originar solicitações de OCI (Unidade Solicitante)</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {editando ? 'Salvar Alterações' : 'Cadastrar'}
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
