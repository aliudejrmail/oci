import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Search, Plus, Edit, Trash2, X, Save, Power, PowerOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface Profissional {
  id: string
  nome: string
  cns: string
  cboId?: string
  cbo?: string
  ativo: boolean
  createdAt: string
  updatedAt: string
  cboRelacao?: {
    id: string
    codigo: string
    descricao: string
  }
  unidades?: {
    unidade: {
      id: string
      nome: string
      cnes: string
    }
  }[]
}

interface UnidadeSaude {
  id: string
  nome: string
  cnes: string
  ativo: boolean
}

interface Cbo {
  id: string
  codigo: string
  descricao: string
  ativo: boolean
}

export default function Profissionais() {
  const { usuario } = useAuth()
  const isAdmin = usuario?.tipo === 'ADMIN'
  const isGestor = usuario?.tipo === 'GESTOR'
  const isAutorizador = usuario?.tipo === 'AUTORIZADOR'
  const podeGerenciarProfissionais = isAdmin || isGestor || isAutorizador
  const podeAlterarStatus = isAdmin || isAutorizador
  const gestorUnidadeId = isGestor ? (usuario?.unidadeId || null) : null
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [unidades, setUnidades] = useState<UnidadeSaude[]>([])
  const [cbos, setCbos] = useState<Cbo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | null>(true) // null = todos, true = apenas ativos, false = apenas inativos
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Profissional | null>(null)
  const [form, setForm] = useState({
    nome: '',
    cns: '',
    cboId: '',
    unidadesIds: [] as string[]
  })
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroApi, setErroApi] = useState<string | null>(null)

  useEffect(() => {
    carregarUnidades()
    carregarCbos()
  }, [])

  useEffect(() => {
    carregarProfissionais()
  }, [search, filtroAtivo, page, limit])

  const carregarUnidades = async () => {
    try {
      const response = await api.get('/unidades?ativo=true')
      // Backend retorna um array direto em /unidades, sem wrapper { unidades }
      setUnidades(Array.isArray(response.data) ? response.data : response.data.unidades || [])
    } catch (error) {
      console.error('Erro ao carregar unidades:', error)
    }
  }

  const carregarCbos = async () => {
    try {
      const response = await api.get('/profissionais/cbos/listar')
      setCbos(response.data.cbos || [])
    } catch (error) {
      console.error('Erro ao carregar CBOs:', error)
    }
  }

  const carregarProfissionais = async () => {
    setErroApi(null)
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filtroAtivo !== null) {
        params.append('ativo', filtroAtivo.toString())
      }

      params.append('page', page.toString())
      params.append('limit', limit.toString())

      const response = await api.get(`/profissionais?${params.toString()}`)
      const lista = response.data.profissionais || []
      const paginacao = response.data.paginacao || {}

      setProfissionais(lista)
      setTotal(typeof paginacao.total === 'number' ? paginacao.total : lista.length)
      setTotalPages(typeof paginacao.totalPages === 'number' ? paginacao.totalPages : 1)
    } catch (error: any) {
      console.error('Erro ao carregar profissionais:', error)
      setProfissionais([])
      setTotal(0)
      setTotalPages(1)
      const msg = error?.response?.data?.message || error?.message || 'Servidor indisponível.'
      setErroApi(`Não foi possível carregar os profissionais. ${msg} Verifique se o backend está rodando (npm run dev ou npm run dev:server).`)
    } finally {
      setLoading(false)
    }
  }

  const abrirModalNovo = () => {
    setEditando(null)
    setForm({ nome: '', cns: '', cboId: '', unidadesIds: [] })
    setErro(null)
    setModalAberto(true)
  }

  const abrirModalEditar = (profissional: Profissional) => {
    setEditando(profissional)
    setForm({
      nome: profissional.nome,
      cns: profissional.cns,
      cboId: profissional.cboRelacao?.id || profissional.cboId || '',
      unidadesIds: profissional.unidades?.map(u => u.unidade.id) || []
    })
    setErro(null)
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setEditando(null)
    setForm({ nome: '', cns: '', cboId: '', unidadesIds: [] })
    setErro(null)
  }

  const handleCnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 15) {
      value = value.substring(0, 15)
    }
    // Formatar: XXX XXXX XXXX XXXX
    if (value.length > 11) {
      value = `${value.substring(0, 3)} ${value.substring(3, 7)} ${value.substring(7, 11)} ${value.substring(11)}`
    } else if (value.length > 7) {
      value = `${value.substring(0, 3)} ${value.substring(3, 7)} ${value.substring(7)}`
    } else if (value.length > 3) {
      value = `${value.substring(0, 3)} ${value.substring(3)}`
    }
    setForm({ ...form, cns: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setSubmitting(true)

    try {
      if (!form.nome.trim() || !form.cns.trim() || !form.cboId) {
        setErro('Todos os campos são obrigatórios.')
        setSubmitting(false)
        return
      }

      const cnsLimpo = form.cns.replace(/\D/g, '')
      if (cnsLimpo.length !== 15) {
        setErro('O CNS deve conter exatamente 15 dígitos.')
        setSubmitting(false)
        return
      }

      if (editando) {
        await api.patch(`/profissionais/${editando.id}`, {
          nome: form.nome.trim(),
          cns: cnsLimpo,
          cboId: form.cboId,
          unidadesIds: form.unidadesIds
        })
      } else {
        await api.post('/profissionais', {
          nome: form.nome.trim(),
          cns: cnsLimpo,
          cboId: form.cboId,
          unidadesIds: form.unidadesIds
        })
      }

      fecharModal()
      carregarProfissionais()
    } catch (error: any) {
      console.error('Erro ao salvar profissional:', error)
      setErro(error.response?.data?.message || 'Erro ao salvar profissional.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este profissional?')) {
      return
    }

    try {
      await api.delete(`/profissionais/${id}`)
      carregarProfissionais()
    } catch (error: any) {
      const mensagemErro = error.response?.data?.message || 'Erro ao excluir profissional.'
      alert(mensagemErro)
      console.error('Erro ao excluir profissional:', error)
    }
  }

  const handleToggleAtivo = async (profissional: Profissional) => {
    const acao = profissional.ativo ? 'inativar' : 'ativar'
    if (!window.confirm(`Tem certeza que deseja ${acao} este profissional?`)) {
      return
    }

    try {
      await api.patch(`/profissionais/${profissional.id}`, {
        ativo: !profissional.ativo
      })
      carregarProfissionais()
    } catch (error: any) {
      alert(error.response?.data?.message || `Erro ao ${acao} profissional.`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const inicio = total === 0 ? 0 : (page - 1) * limit + 1
  const fim = total === 0 ? 0 : Math.min(page * limit, total)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Profissionais</h1>
          <p className="text-gray-600 mt-1">Gestão de profissionais autorizadores</p>
          {isGestor && usuario?.unidade && (
            <p className="text-xs text-gray-500 mt-1">
              Como gestor da unidade {usuario.unidade.nome}, você só pode adicionar ou remover vínculos de profissionais referentes a esta unidade.
            </p>
          )}
        </div>
        {podeGerenciarProfissionais && (
          <button
            onClick={abrirModalNovo}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Novo Profissional
          </button>
        )}
      </div>

      {erroApi && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          {erroApi}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, CNS ou CBO..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={filtroAtivo === null ? 'todos' : filtroAtivo ? 'ativos' : 'inativos'}
            onChange={(e) => {
              const value = e.target.value
              setFiltroAtivo(value === 'todos' ? null : value === 'ativos')
              setPage(1)
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
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CBO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidades</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {profissionais.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhum profissional encontrado
                  </td>
                </tr>
              ) : (
                profissionais.map((profissional) => (
                  <tr key={profissional.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {profissional.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {profissional.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {profissional.cboRelacao ? (
                        <div>
                          <div className="font-medium">{profissional.cboRelacao.codigo}</div>
                          <div className="text-xs text-gray-400">{profissional.cboRelacao.descricao}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">{profissional.cbo || 'Não informado'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {profissional.unidades && profissional.unidades.length > 0 ? (
                        <div className="max-w-xs">
                          {profissional.unidades.map((u, idx) => (
                            <div key={idx} className="text-xs truncate" title={u.unidade.nome}>
                              {u.unidade.nome}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">Nenhuma unidade</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        profissional.ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {profissional.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {podeGerenciarProfissionais && (
                          <>
                            <button
                              onClick={() => abrirModalEditar(profissional)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            {podeAlterarStatus && (
                              <button
                                onClick={() => handleToggleAtivo(profissional)}
                                className={profissional.ativo 
                                  ? "text-orange-600 hover:text-orange-800" 
                                  : "text-green-600 hover:text-green-800"
                                }
                                title={profissional.ativo ? "Inativar" : "Ativar"}
                              >
                                {profissional.ativo ? <PowerOff size={18} /> : <Power size={18} />}
                              </button>
                            )}
                          </>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleExcluir(profissional.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
          <div>
            {total > 0 && (
              <span>
                Mostrando {inicio}-{fim} de {total} profissionais
              </span>
            )}
            {total === 0 && <span>Nenhum profissional encontrado</span>}
          </div>
          <div className="flex items-center gap-4 justify-end">
            <div className="flex items-center gap-2">
              <span>Por página:</span>
              <select
                value={limit}
                onChange={(e) => {
                  const novoLimit = parseInt(e.target.value, 10) || 10
                  setLimit(novoLimit)
                  setPage(1)
                }}
                className="border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className={`px-3 py-1 rounded border text-sm ${
                page === 1
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Anterior
            </button>
            <span>
              Página {totalPages === 0 ? 0 : page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => (totalPages ? Math.min(totalPages, prev + 1) : prev + 1))}
              disabled={totalPages !== 0 && page >= totalPages}
              className={`px-3 py-1 rounded border text-sm ${
                totalPages !== 0 && page >= totalPages
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editando ? 'Editar Profissional' : 'Novo Profissional'}
              </h2>
              <button
                onClick={fecharModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={submitting}
              >
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
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Ex: Dr. João Silva"
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <label htmlFor="cns" className="block text-sm font-medium text-gray-700 mb-1">
                  Cartão Nacional de Saúde (CNS) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="cns"
                  value={form.cns}
                  onChange={handleCnsChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="000 0000 0000 0000"
                  maxLength={18}
                  disabled={submitting}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Formato: 15 dígitos</p>
              </div>

              <div>
                <label htmlFor="cboId" className="block text-sm font-medium text-gray-700 mb-1">
                  CBO (Código Brasileiro de Ocupação) <span className="text-red-500">*</span>
                </label>
                <select
                  id="cboId"
                  value={form.cboId}
                  onChange={(e) => setForm({ ...form, cboId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={submitting}
                  required
                >
                  <option value="">Selecione um CBO...</option>
                  {cbos.map((cbo) => (
                    <option key={cbo.id} value={cbo.id}>
                      {cbo.codigo} - {cbo.descricao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidades de Saúde
                </label>
                {isGestor && gestorUnidadeId && (
                  <p className="text-xs text-gray-500 mb-2">
                    Você só pode marcar ou desmarcar a unidade em que está lotado; vínculos com outras unidades são apenas para visualização.
                  </p>
                )}
                <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-2 space-y-2">
                  {unidades.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Nenhuma unidade disponível</p>
                  ) : (
                    unidades.map((unidade) => (
                      <label
                        key={unidade.id}
                        className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        {(() => {
                          const podeAlterarUnidade = !isGestor || (gestorUnidadeId && unidade.id === gestorUnidadeId)
                          const checked = form.unidadesIds.includes(unidade.id)
                          return (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, unidadesIds: [...form.unidadesIds, unidade.id] })
                            } else {
                              setForm({ ...form, unidadesIds: form.unidadesIds.filter(id => id !== unidade.id) })
                            }
                          }}
                          disabled={submitting || !podeAlterarUnidade}
                          className="mt-0.5"
                        />
                          )
                        })()}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{unidade.nome}</div>
                          <div className="text-xs text-gray-500">CNES: {unidade.cnes}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">Selecione as unidades onde o profissional atua</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
