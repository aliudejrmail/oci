import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { Search, Plus, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react'
import { formatarData } from '../utils/date-format'
import NovaSolicitacaoModal from '../components/NovaSolicitacaoModal'
import { useAuth } from '../contexts/AuthContext'

interface Solicitacao {
  id: string
  numeroProtocolo: string
  paciente: {
    nome: string
    cpf: string
  }
  oci: {
    nome: string
    tipo: string
  }
  medicoSolicitante?: {
    nome: string
  } | null
  status: string
  dataSolicitacao: string
  dataPrazo: string
  competenciaFimApac?: string | null
  prazoApresentacaoApac?: string | Date | null
  dataFimValidadeApac?: string | Date | null
  numeroAutorizacaoApac?: string | null
  dataAutorizacaoApac?: string | Date | null
  dataInicioValidadeApac?: string | Date | null
  alerta: {
    diasRestantes: number
    nivelAlerta: string
  } | null
}

export default function Solicitacoes() {
  const { usuario } = useAuth()
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNovaAberta, setModalNovaAberta] = useState(false)
  const [filtros, setFiltros] = useState({
    status: '',
    search: '',
    unidadeExecutora: '',
    tipoId: ''
  })
  const [tiposOci, setTiposOci] = useState<Array<{ id: string; nome: string }>>([])
  const [searchInput, setSearchInput] = useState('')
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const [unidadesExecutantes, setUnidadesExecutantes] = useState<Array<{ id: string; cnes: string; nome: string }>>([])
  const [erroApi, setErroApi] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const podeFiltrarPorUnidade = usuario?.tipo === 'ADMIN' || usuario?.tipo === 'GESTOR'

  useEffect(() => {
    if (podeFiltrarPorUnidade && unidadesExecutantes.length === 0) {
      api.get('/unidades-executantes?ativo=true').then((res) => {
        setUnidadesExecutantes(Array.isArray(res.data) ? res.data : [])
      }).catch(() => setUnidadesExecutantes([]))
    }

    // Buscar tipos de OCI para filtro
    api.get('/tipos-oci').then(res => setTiposOci(res.data)).catch(() => setTiposOci([]))
  }, [podeFiltrarPorUnidade])

  useEffect(() => {
    carregarSolicitacoes()
  }, [filtros, page, limit])

  // Debounce para o campo de busca
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    debounceTimeout.current = setTimeout(() => {
      setFiltros(f => ({ ...f, search: searchInput }))
      setPage(1)
    }, 500)
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    }
  }, [searchInput])

  const carregarSolicitacoes = async () => {
    setErroApi(null)
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtros.status) params.append('status', filtros.status)
      if (filtros.tipoId) params.append('tipoId', filtros.tipoId)
      if (filtros.search) params.append('search', filtros.search)
      if (filtros.unidadeExecutora) params.append('unidadeExecutora', filtros.unidadeExecutora)
      // Adicionar timestamp para evitar cache
      params.append('_t', Date.now().toString())
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      const response = await api.get(`/solicitacoes?${params.toString()}`)
      const lista = response.data?.solicitacoes ?? (Array.isArray(response.data) ? response.data : [])
      setSolicitacoes(Array.isArray(lista) ? lista : [])
      const paginacao = response.data.paginacao || {}
      setTotal(typeof paginacao.total === 'number' ? paginacao.total : (Array.isArray(lista) ? lista.length : 0))
      setTotalPages(typeof paginacao.totalPages === 'number' ? paginacao.totalPages : 1)
    } catch (error: any) {
      console.error('❌ Erro ao carregar solicitações:', error)
      setSolicitacoes([])
      setTotal(0)
      setTotalPages(1)
      const msg = error?.response?.data?.message || error?.message || 'Servidor indisponível.'
      setErroApi(`Não foi possível carregar as solicitações. ${msg} Verifique se o backend está rodando (npm run dev ou npm run dev:server).`)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return <Clock className="text-yellow-600" size={14} />
      case 'EM_ANDAMENTO':
        return <Clock className="text-blue-600" size={14} />
      case 'CONCLUIDA':
        return <CheckCircle className="text-green-600" size={14} />
      case 'VENCIDA':
        return <XCircle className="text-red-600" size={14} />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDENTE: 'Pendente',
      EM_ANDAMENTO: 'Em Andamento',
      CONCLUIDA: 'Concluída',
      VENCIDA: 'Vencida',
      CANCELADA: 'Cancelada'
    }
    // Abreviar para economizar espaço
    const abreviacoes: Record<string, string> = {
      PENDENTE: 'Pend.',
      EM_ANDAMENTO: 'Em And.',
      CONCLUIDA: 'Concl.',
      VENCIDA: 'Venc.',
      CANCELADA: 'Cancel.'
    }
    return abreviacoes[status] || labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDENTE: 'bg-yellow-100 text-yellow-800',
      EM_ANDAMENTO: 'bg-blue-100 text-blue-800',
      CONCLUIDA: 'bg-green-100 text-green-800',
      VENCIDA: 'bg-red-100 text-red-800',
      CANCELADA: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
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

  // Componente de paginação (topo e base)
  const Paginacao = () => (
    <div className="mt-2 mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
      <div>
        {total > 0 && (
          <span>
            Mostrando {inicio}-{fim} de {total} solicitações
          </span>
        )}
        {total === 0 && <span>Nenhuma solicitação encontrada</span>}
      </div>
      <div className="flex items-center gap-4 justify-end">
        <div className="flex items-center gap-2">
          <span>Por página:</span>
          <select
            value={limit}
            onChange={e => {
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
          onClick={() => setPage(prev => Math.max(1, prev - 1))}
          disabled={page === 1}
          className={`px-3 py-1 rounded border text-sm ${page === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          Anterior
        </button>
        <span>
          Página {totalPages === 0 ? 0 : page} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage(prev => (totalPages ? Math.min(totalPages, prev + 1) : prev + 1))}
          disabled={totalPages !== 0 && page >= totalPages}
          className={`px-3 py-1 rounded border text-sm ${totalPages !== 0 && page >= totalPages ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          Próxima
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Solicitações OCI</h1>
          <p className="text-gray-600 mt-1">
            {usuario?.tipo === 'AUTORIZADOR' ? 'Registro de APAC e acompanhamento' : usuario?.tipo === 'EXECUTANTE' ? 'Registro de procedimentos executados' : 'Gestão de solicitações de procedimentos'}
          </p>
        </div>
        {usuario?.tipo !== 'AUTORIZADOR' && usuario?.tipo !== 'EXECUTANTE' && (
          <button
            type="button"
            onClick={() => setModalNovaAberta(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Nova Solicitação
          </button>
        )}
      </div>

      {erroApi && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          {erroApi}
        </div>
      )}

      {/* Aviso: Executante sem unidade vinculada não vê agendamentos por unidade */}
      {usuario?.tipo === 'EXECUTANTE' && !usuario?.unidadeExecutanteId && !loading && solicitacoes.length === 0 && !erroApi && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Nenhum agendamento exibido</p>
          <p className="mt-1 text-sm">
            Para visualizar as solicitações com procedimentos agendados na sua unidade, é necessário vincular sua <strong>Unidade executante</strong> no cadastro de usuários. Peça a um administrador ou gestor para definir sua unidade executante no cadastro de usuários.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        {/* Paginação no topo */}
        <Paginacao />
        <div className={`grid grid-cols-1 gap-4 ${podeFiltrarPorUnidade ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por protocolo, paciente ou CPF..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <select
            value={filtros.status}
            onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="CONCLUIDA">Concluída</option>
            <option value="VENCIDA">Vencida</option>
          </select>
          <select
            value={filtros.tipoId}
            onChange={(e) => setFiltros({ ...filtros, tipoId: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os tipos</option>
            {tiposOci.map(t => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
          {podeFiltrarPorUnidade && (
            <select
              value={filtros.unidadeExecutora}
              onChange={(e) => setFiltros({ ...filtros, unidadeExecutora: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              title="Filtrar por unidade onde os procedimentos foram agendados"
            >
              <option value="">Todas as unidades</option>
              {unidadesExecutantes.map((u) => (
                <option key={u.id} value={`${u.cnes} - ${u.nome}`}>
                  {u.cnes} - {u.nome}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Lista de Solicitações */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-tight">
                  Protocolo
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-tight">
                  Paciente
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-tight">
                  OCI
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-tight">
                  Médico Solicitante
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-tight">
                  Status
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-tight">
                  Dt. Cadastro
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-tight">
                  Dt. Autorização APAC
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-tight">
                  Prazo
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-tight">
                  Nº APAC
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-tight">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {solicitacoes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-2 py-4 text-center text-xs text-gray-500">
                    Nenhuma solicitação encontrada
                  </td>
                </tr>
              ) : (
                solicitacoes.map((solicitacao) => {
                  const alerta = solicitacao.alerta
                  // Verificar se o primeiro procedimento foi executado
                  // (quando dataInicioValidadeApac não é null)
                  const primeiroProcedimentoExecutado = !!solicitacao.dataInicioValidadeApac

                  return (
                    <tr key={solicitacao.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-gray-900 font-mono">
                            {solicitacao.numeroProtocolo.replace('OCI-', '')}
                          </span>
                          {alerta && alerta.nivelAlerta === 'CRITICO' && (
                            <AlertCircle className="text-red-600" size={12} />
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="text-xs text-gray-900 truncate max-w-[120px]" title={solicitacao.paciente.nome}>
                          {solicitacao.paciente.nome}
                        </div>
                        <div className="text-[10px] text-gray-500">{solicitacao.paciente.cpf}</div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="text-xs text-gray-900 truncate max-w-[150px]" title={solicitacao.oci.nome}>
                          {solicitacao.oci.nome}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {solicitacao.oci.tipo === 'GERAL' ? 'Geral' : 'Oncológico'}
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="text-[11px] text-gray-900 truncate max-w-[150px]" title={solicitacao.medicoSolicitante?.nome || ''}>
                          {solicitacao.medicoSolicitante?.nome || (
                            <span className="text-gray-400 italic text-[10px]">Não informado</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(solicitacao.status)}
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${getStatusColor(solicitacao.status)}`}>
                            {getStatusLabel(solicitacao.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                        {formatarData(solicitacao.dataSolicitacao)}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                        {solicitacao.dataAutorizacaoApac ? (
                          formatarData(solicitacao.dataAutorizacaoApac)
                        ) : (
                          <span className="text-gray-400 italic text-[10px]">Não informado</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {primeiroProcedimentoExecutado && solicitacao.competenciaFimApac && solicitacao.dataFimValidadeApac ? (
                          <>
                            <div className="text-xs text-gray-900 font-medium">
                              Registro proc.: {formatarData(solicitacao.dataFimValidadeApac)}
                            </div>
                            {alerta && (
                              <div className={`text-[10px] ${alerta.diasRestantes < 0 ? 'text-red-600 font-medium' : alerta.diasRestantes <= 10 ? 'text-orange-600' : 'text-gray-500'
                                }`}>
                                {alerta.diasRestantes < 0 ? `${Math.abs(alerta.diasRestantes)}d venc.` : `${alerta.diasRestantes}d rest.`} (registro)
                              </div>
                            )}
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              Apres. APAC: {solicitacao.prazoApresentacaoApac
                                ? formatarData(solicitacao.prazoApresentacaoApac)
                                : '–'}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs text-gray-900">
                              {solicitacao.dataPrazo ? formatarData(solicitacao.dataPrazo) : '–'}
                            </div>
                            {alerta && (
                              <div className={`text-[10px] ${alerta.diasRestantes < 0 ? 'text-red-600 font-medium' : alerta.diasRestantes <= 10 ? 'text-orange-600' : 'text-gray-500'
                                }`}>
                                {alerta.diasRestantes < 0 ? `${Math.abs(alerta.diasRestantes)}d venc.` : `${alerta.diasRestantes}d rest.`}
                              </div>
                            )}
                            {!primeiroProcedimentoExecutado && (
                              <div className="text-[10px] text-gray-400 italic mt-0.5">Aguardando 1º proc.</div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs">
                        {solicitacao.numeroAutorizacaoApac ? (
                          <div className="text-xs text-gray-900 font-mono">
                            {solicitacao.numeroAutorizacaoApac.substring(0, 4)}
                            {solicitacao.numeroAutorizacaoApac.charAt(4)}
                            -{solicitacao.numeroAutorizacaoApac.substring(5)}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[10px]">Não informado</span>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs">
                        <Link
                          to={`/solicitacoes/${solicitacao.id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Paginação na base */}
      <Paginacao />

      <NovaSolicitacaoModal
        open={modalNovaAberta}
        onClose={() => setModalNovaAberta(false)}
        onSuccess={() => carregarSolicitacoes()}
      />
    </div>
  )
}
