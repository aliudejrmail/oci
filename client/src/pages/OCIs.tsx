import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Search, Plus, Package, Edit, X, Save } from 'lucide-react'

interface Procedimento {
  id: string
  codigo: string
  codigoSigtap?: string | null
  nome: string
  descricao?: string | null
  tipo: string
  ordem: number
  obrigatorio: boolean
}

interface OCI {
  id: string
  codigo: string
  nome: string
  descricao?: string
  tipoId: string
  tipo?: { id: string; nome: string }
  prazoMaximoDias: number
  ativo: boolean
  procedimentos: Procedimento[]
  _count?: {
    solicitacoes: number
  }
}

interface TipoOci {
  id: string
  nome: string
  descricao?: string
  ativo: boolean
}

export default function OCIs() {
  const [ocis, setOcis] = useState<OCI[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [erroApi, setErroApi] = useState<string | null>(null)

  // Estados para edição de OCI
  const [ociEdit, setOciEdit] = useState<OCI | null>(null)
  const [formEdit, setFormEdit] = useState<{
    nome: string
    descricao: string
    tipo: string
    prazoMaximoDias: number
    ativo: boolean
  }>({ nome: '', descricao: '', tipo: 'GERAL', prazoMaximoDias: 60, ativo: true })
  const [procedimentosEdit, setProcedimentosEdit] = useState<Array<Procedimento & { obrigatorio: boolean }>>([])

  // Estados para Tipos de OCI
  const [tiposOci, setTiposOci] = useState<TipoOci[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState<string | null>(null)

  useEffect(() => {
    carregarTiposOci()
  }, [])

  useEffect(() => {
    carregarOCIs()
  }, [search, filtroTipo])

  const abrirModalEditar = (oci: OCI) => {
    setOciEdit(oci)
    setFormEdit({
      nome: oci.nome,
      descricao: oci.descricao ?? '',
      tipo: oci.tipoId,
      prazoMaximoDias: oci.prazoMaximoDias,
      ativo: oci.ativo
    })
    setProcedimentosEdit(oci.procedimentos.map((p) => ({ ...p, obrigatorio: p.obrigatorio })))
    setErroModal(null)
  }

  const fecharModalEditar = () => {
    setOciEdit(null)
    setFormEdit({ nome: '', descricao: '', tipo: 'GERAL', prazoMaximoDias: 60, ativo: true })
    setProcedimentosEdit([])
    setErroModal(null)
  }

  const toggleObrigatorio = (id: string) => {
    setProcedimentosEdit((prev) =>
      prev.map((p) => (p.id === id ? { ...p, obrigatorio: !p.obrigatorio } : p))
    )
  }

  const salvarEdicaoOci = async () => {
    if (!ociEdit) return
    if (!formEdit.nome.trim()) {
      setErroModal('Nome da OCI é obrigatório.')
      return
    }
    const prazo = Number(formEdit.prazoMaximoDias)
    if (Number.isNaN(prazo) || prazo < 1 || prazo > 365) {
      setErroModal('Prazo máximo deve ser entre 1 e 365 dias.')
      return
    }
    setSalvando(true)
    setErroModal(null)
    try {
      const payloadProcedimentos = procedimentosEdit.map((p) => ({
        codigo: p.codigo,
        codigoSigtap: p.codigoSigtap ?? undefined,
        nome: p.nome,
        descricao: p.descricao ?? undefined,
        tipo: p.tipo,
        ordem: p.ordem,
        obrigatorio: p.obrigatorio
      }))
      await api.put(`/ocis/${ociEdit.id}`, {
        codigo: ociEdit.codigo,
        nome: formEdit.nome.trim(),
        descricao: formEdit.descricao.trim() || undefined,
        tipo: formEdit.tipo,
        prazoMaximoDias: prazo,
        ativo: formEdit.ativo,
        procedimentos: payloadProcedimentos
      })
      fecharModalEditar()
      carregarOCIs()
    } catch (error: any) {
      setErroModal(error.response?.data?.message || error.message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const carregarTiposOci = async () => {
    try {
      const res = await api.get('/tipos-oci')
      setTiposOci(res.data)
      // Se não houver tipo selecionado, padrão para o primeiro
      if (res.data.length > 0 && !formEdit.tipo) {
        setFormEdit(f => ({ ...f, tipo: res.data[0].id }))
      }
    } catch (e) {
      console.error('Erro ao buscar tipos de OCI:', e)
    }
  }

  const carregarOCIs = async () => {
    setErroApi(null)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filtroTipo) params.append('tipoId', filtroTipo)
      params.append('ativo', 'true')

      const response = await api.get(`/ocis?${params.toString()}`)
      setOcis(response.data || [])
    } catch (error: any) {
      console.error('Erro ao carregar OCIs:', error)
      setOcis([])
      const msg = error?.response?.data?.message || error?.message || 'Servidor indisponível.'
      setErroApi(`Não foi possível carregar as OCIs. ${msg} Verifique se o backend está rodando (npm run dev ou npm run dev:server).`)
    } finally {
      setLoading(false)
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">OCIs - Ofertas de Cuidados Integrados</h1>
          <p className="text-gray-600 mt-1">Catálogo de OCIs disponíveis</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2">
            <Plus size={20} />
            Nova OCI
          </button>
        </div>
      </div>

      {erroApi && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          {erroApi}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os tipos</option>
            {tiposOci.map(t => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ocis.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              Nenhuma OCI encontrada
            </div>
          ) : (
            ocis.map((oci) => (
              <div key={oci.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Package className="text-primary-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{oci.nome}</h3>
                      <p className="text-sm text-gray-500">
                        Código: {oci.codigo}
                        {/^09\d{4}$/.test(oci.codigo) && (
                          <span className="ml-1 text-xs text-primary-600">(forma SIGTAP)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {oci.descricao && (
                  <p className="text-sm text-gray-600 mb-4">{oci.descricao}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Tipo:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${oci.tipo?.nome.toUpperCase().includes('ONCOLOGICO')
                      ? 'bg-pink-100 text-pink-800'
                      : 'bg-blue-100 text-blue-800'
                      }`}>
                      {oci.tipo?.nome || 'Geral'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Prazo máximo:</span>
                    <span className="font-medium text-gray-900">{oci.prazoMaximoDias} dias</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Procedimentos:</span>
                    <span className="font-medium text-gray-900">{oci.procedimentos.length}</span>
                  </div>
                  {oci._count && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Solicitações:</span>
                      <span className="font-medium text-gray-900">{oci._count.solicitacoes}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500">Procedimentos:</p>
                    <button
                      type="button"
                      onClick={() => abrirModalEditar(oci)}
                      className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      title="Editar OCI e definir procedimentos obrigatórios (portarias MS)"
                    >
                      <Edit size={14} />
                      Editar OCI
                    </button>
                  </div>
                  <div className="space-y-1">
                    {oci.procedimentos.slice(0, 3).map((proc) => (
                      <div key={proc.id} className="text-xs text-gray-600">
                        {proc.ordem}. {proc.nome}
                        {proc.codigoSigtap && (
                          <span className="ml-1 text-gray-400">({proc.codigoSigtap})</span>
                        )}
                        <span className={proc.obrigatorio ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                          {proc.obrigatorio ? ' · Obrigatório' : ' · Opcional'}
                        </span>
                      </div>
                    ))}
                    {oci.procedimentos.length > 3 && (
                      <p className="text-xs text-gray-500">
                        +{oci.procedimentos.length - 3} procedimento(s)
                      </p>
                    )}
                  </div>
                  {oci.procedimentos.some((p) => p.codigoSigtap) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-1">Códigos completos (tabela SIGTAP):</p>
                      <p className="text-xs text-gray-600 font-mono break-all">
                        {oci.procedimentos
                          .filter((p) => p.codigoSigtap)
                          .map((p) => p.codigoSigtap)
                          .join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Editar OCI */}
      {ociEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Editar OCI — {ociEdit.codigo}</h2>
              <button
                type="button"
                onClick={fecharModalEditar}
                disabled={salvando}
                className="p-1 rounded text-gray-500 hover:bg-gray-100"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            {erroModal && (
              <div className="mx-4 mt-2 p-2 rounded bg-red-50 text-red-700 text-sm">{erroModal}</div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Código</label>
                  <input
                    type="text"
                    value={ociEdit.codigo}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm"
                  />
                  <p className="text-[10px] text-gray-500 mt-0.5">Código não pode ser alterado (referência SIGTAP).</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formEdit.nome}
                    onChange={(e) => setFormEdit((f) => ({ ...f, nome: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="Nome da OCI"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={formEdit.descricao}
                    onChange={(e) => setFormEdit((f) => ({ ...f, descricao: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                    placeholder="Descrição opcional"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                    <select
                      value={formEdit.tipo}
                      onChange={(e) => setFormEdit((f) => ({ ...f, tipo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      {tiposOci.map(t => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Prazo máximo (dias)</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={formEdit.prazoMaximoDias}
                      onChange={(e) => setFormEdit((f) => ({ ...f, prazoMaximoDias: Number(e.target.value) || 60 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formEdit.ativo}
                    onChange={(e) => setFormEdit((f) => ({ ...f, ativo: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">OCI ativa</span>
                </label>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs font-medium text-gray-700 mb-1">Procedimentos obrigatórios (portarias MS)</p>
                <p className="text-[10px] text-gray-500 mb-2">
                  Marque os procedimentos que são obrigatórios conforme portarias do Ministério da Saúde.
                </p>
                <div className="space-y-2">
                  {procedimentosEdit.map((proc) => (
                    <label
                      key={proc.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={proc.obrigatorio}
                        onChange={() => toggleObrigatorio(proc.id)}
                        className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900 text-sm">{proc.ordem}. {proc.nome}</span>
                        {proc.codigoSigtap && (
                          <span className="ml-1 text-xs text-gray-500">({proc.codigoSigtap})</span>
                        )}
                      </div>
                      <span className={`text-xs shrink-0 ${proc.obrigatorio ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                        {proc.obrigatorio ? 'Obrigatório' : 'Opcional'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button
                type="button"
                onClick={fecharModalEditar}
                disabled={salvando}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarEdicaoOci}
                disabled={salvando}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {salvando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

