import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileCheck,
  Calendar,
  Bell
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

interface Estatisticas {
  totalSolicitacoes: number
  porStatus: {
    pendentes: number
    emAndamento: number
    concluidas: number
    vencidas: number
    canceladas: number
  }
  porTipo: Record<string, number>
  indicadores: {
    taxaConclusao: number
    tempoMedioConclusaoDias: number
  }
}

interface Alerta {
  id: string
  diasRestantes: number
  nivelAlerta: 'INFO' | 'ATENCAO' | 'CRITICO'
  notificado: boolean
  solicitacao: {
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
    dataPrazo: string
  }
}

interface ApacProximaVencimento {
  id: string
  numeroProtocolo: string
  numeroAutorizacaoApac: string | null
  competenciaFimApac: string | null
  diasRestantesCompetenciaApac: number | null
  paciente: {
    id: string
    nome: string
    cpf: string
  }
  oci: {
    id: string
    codigo: string
    nome: string
    tipo: string
  }
}

interface SolicitacaoProximaPrazoRegistro {
  id: string
  numeroProtocolo: string
  competenciaFimApac: string | null
  dataFimValidadeApac: string
  diasRestantesPrazoRegistro: number
  paciente: {
    id: string
    nome: string
    cpf: string
  }
  oci: {
    id: string
    codigo: string
    nome: string
    tipo: string
  }
}

interface AlertaResultadoBiopsia {
  id: string
  diasRestantes: number
  nivelAlerta: 'INFO' | 'ATENCAO' | 'CRITICO'
  prazoResultado: string
  tipoOci?: 'GERAL' | 'ONCOLOGICO'
  tipoPrazo: string
  dataColeta: string
  solicitacao: {
    id: string
    numeroProtocolo: string
    paciente: { nome: string; cpf: string }
    oci: { nome: string; tipo: string }
  }
  procedimento: { nome: string; codigo: string }
}

interface NotificacaoAutorizador {
  apacsPendentes: any[]
  solicitacoesRecentes: any[]
  totalApacsPendentes: number
  totalSolicitacoesRecentes: number
}

export default function Dashboard() {
  const { usuario } = useAuth()
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [evolucao, setEvolucao] = useState<any[]>([])
  const [apacsProximasVencimento, setApacsProximasVencimento] = useState<ApacProximaVencimento[]>([])
  const [solicitacoesProximasPrazoRegistro, setSolicitacoesProximasPrazoRegistro] = useState<SolicitacaoProximaPrazoRegistro[]>([])
  const [alertasResultadoBiopsia, setAlertasResultadoBiopsia] = useState<AlertaResultadoBiopsia[]>([])
  const [notificacoesAutorizador, setNotificacoesAutorizador] = useState<NotificacaoAutorizador | null>(null)
  const [loading, setLoading] = useState(true)
  const [erroApi, setErroApi] = useState<string | null>(null)

  useEffect(() => {
    carregarDados()
  }, [usuario?.tipo])

  const carregarDados = async () => {
    setErroApi(null)
    try {
      const promises: Promise<any>[] = [
        api.get('/dashboard/estatisticas'),
        api.get('/dashboard/alertas').catch(() => ({ data: [] })),
        api.get('/dashboard/alertas-resultado-biopsia').catch(() => ({ data: [] })),
        api.get('/dashboard/evolucao-temporal?dias=30'),
        api.get('/dashboard/apacs-proximas-vencimento'),
        api.get('/dashboard/proximas-prazo-registro-procedimentos').catch(() => ({ data: [] }))
      ]

      if (usuario?.tipo === 'DIRCA') {
        promises.push(api.get('/dashboard/notificacoes-dirca').catch(() => ({ data: { apacsPendentes: [], solicitacoesRecentes: [], totalApacsPendentes: 0, totalSolicitacoesRecentes: 0 } })))
      }

      const results = await Promise.all(promises)
      setEstatisticas(results[0].data)
      setAlertas(results[1].data || [])
      setAlertasResultadoBiopsia(results[2].data || [])
      setEvolucao(results[3].data)
      setApacsProximasVencimento(results[4].data)
      setSolicitacoesProximasPrazoRegistro(results[5].data || [])

      if (usuario?.tipo === 'AUTORIZADOR' && results.length > 6) {
        setNotificacoesAutorizador(results[6].data)
      } else {
        setNotificacoesAutorizador(null)
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      const msg = error?.response?.data?.message || error?.message || 'Servidor indisponível.'
      setErroApi(`Não foi possível carregar o painel. ${msg} Verifique se o backend está rodando (npm run dev ou npm run dev:server).`)
      // Não limpar os dados em caso de erro: manter última carga para evitar "carregam e somem"
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

  const cards = [
    {
      title: 'Total de Solicitações',
      value: estatisticas?.totalSolicitacoes || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pendentes',
      value: estatisticas?.porStatus.pendentes || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Concluídas',
      value: estatisticas?.porStatus.concluidas || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Vencidas',
      value: estatisticas?.porStatus.vencidas || 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ]

  const alertasCriticos = alertas.filter(a => a.nivelAlerta === 'CRITICO').slice(0, 5)
  const isAutorizador = usuario?.tipo === 'AUTORIZADOR'

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
        <p className="text-xs text-gray-600 mt-0.5">
          {isAutorizador ? 'Notificações e registro de APAC' : usuario?.tipo === 'EXECUTANTE' ? 'Registro de procedimentos executados' : 'Visão geral do sistema OCI'}
        </p>
      </div>

      {erroApi && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
          {erroApi}
        </div>
      )}

      {/* Alertas Críticos - no topo da página */}
      {alertasCriticos.length > 0 && (
        <div className="bg-white rounded-lg shadow p-3 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <AlertTriangle className="text-red-600" size={14} />
              Alertas Críticos de Prazo
            </h2>
            <Link 
              to="/solicitacoes?status=PENDENTE&status=EM_ANDAMENTO"
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Ver todas →
            </Link>
          </div>
          <div className="space-y-2">
            {alertasCriticos.map((alerta: any) => {
              const isVencido = alerta.diasRestantes < 0
              const isUrgente = !isVencido && alerta.diasRestantes <= 3
              // Dias restantes referem-se à data limite de REGISTRO/REALIZAÇÃO de procedimentos
              const dataLimiteRegistro = alerta.dataFimValidadeApac
              const prazoExibir = dataLimiteRegistro
                ? format(new Date(dataLimiteRegistro), 'dd/MM/yyyy')
                : alerta.prazoRelevante 
                  ? format(new Date(alerta.prazoRelevante), 'dd/MM/yyyy')
                  : alerta.solicitacao?.dataPrazo 
                    ? format(new Date(alerta.solicitacao.dataPrazo), 'dd/MM/yyyy')
                    : '-'
              const tipoPrazoExibir = dataLimiteRegistro ? 'Data limite registro procedimentos' : (alerta.tipoPrazo || 'Prazo')
              const labelDiasRestantes = dataLimiteRegistro ? 'para registro de procedimentos' : ''
              
              return (
                <Link
                  key={alerta.id}
                  to={`/solicitacoes/${alerta.solicitacao?.id}`}
                  className={`block border-l-4 p-2 rounded-r-lg transition-colors hover:opacity-90 ${
                    isVencido
                      ? 'border-red-500 bg-red-50 hover:bg-red-100'
                      : isUrgente
                      ? 'border-orange-500 bg-orange-50 hover:bg-orange-100'
                      : 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs text-gray-900 truncate">
                        {alerta.solicitacao.numeroProtocolo}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">
                        {alerta.solicitacao.paciente.nome} - {alerta.solicitacao.oci.nome}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {tipoPrazoExibir}: {prazoExibir}
                      </p>
                      {alerta.prazoApresentacaoApac && dataLimiteRegistro && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Prazo apresentação APAC: {format(new Date(alerta.prazoApresentacaoApac), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-2">
                      <p className={`text-sm font-bold ${
                        isVencido ? 'text-red-600' : isUrgente ? 'text-orange-600' : 'text-yellow-600'
                      }`}>
                        {isVencido 
                          ? `${Math.abs(alerta.diasRestantes)} dia(s) vencido(s)`
                          : `${alerta.diasRestantes} dia(s) restante(s)${labelDiasRestantes ? ` ${labelDiasRestantes}` : ''}`
                        }
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Alertas: procedimentos anatomo-patológicos obrigatórios – coleta registrada, resultado pendente */}
      {alertasResultadoBiopsia.length > 0 && (
        <div className="bg-white rounded-lg shadow p-3 border-l-4 border-amber-500">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <FileCheck className="text-amber-600" size={14} />
              Pendentes de resultado anatomo-patológico
            </h2>
            <span className="text-xs text-gray-500">
              Procedimentos anatomo-patológicos obrigatórios com coleta registrada e resultado pendente. Oncológica: 30 dias desde a consulta. Geral: 30 dias desde a coleta.
            </span>
          </div>
          <div className="space-y-2">
            {alertasResultadoBiopsia.slice(0, 10).map((alerta: AlertaResultadoBiopsia) => {
              const isVencido = alerta.diasRestantes < 0
              const isUrgente = !isVencido && alerta.diasRestantes <= (alerta.solicitacao.oci.tipo === 'ONCOLOGICO' ? 5 : 10)
              const borderColor = isVencido ? 'border-red-500 bg-red-50' : isUrgente ? 'border-amber-500 bg-amber-50' : 'border-blue-300 bg-blue-50'
              const textColor = isVencido ? 'text-red-600' : isUrgente ? 'text-amber-700' : 'text-blue-700'
              return (
                <Link
                  key={alerta.id}
                  to={`/solicitacoes/${alerta.solicitacao.id}`}
                  className={`block border-l-4 p-2 rounded-r-lg transition-colors hover:opacity-90 ${borderColor} hover:opacity-90`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs text-gray-900 truncate">
                        {alerta.solicitacao.numeroProtocolo}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">
                        {alerta.solicitacao.paciente.nome} – {alerta.solicitacao.oci.nome}
                        {alerta.solicitacao.oci.tipo === 'ONCOLOGICO' && (
                          <span className="ml-1 text-amber-700 font-medium">(Oncológico)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 truncate" title={alerta.procedimento.nome}>
                        Procedimento: {alerta.procedimento.nome}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Coleta: {format(new Date(alerta.dataColeta), 'dd/MM/yyyy')} · Prazo resultado: {format(new Date(alerta.prazoResultado), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className={`text-sm font-bold ${textColor}`}>
                        {isVencido
                          ? `${Math.abs(alerta.diasRestantes)} dia(s) vencido(s)`
                          : `${alerta.diasRestantes} dia(s) para resultado`
                        }
                        {alerta.tipoOci && (
                          <span className="block text-[10px] font-normal text-gray-500 mt-0.5">
                            (OCI {alerta.tipoOci === 'ONCOLOGICO' ? 'oncológica – 30 dias desde a consulta' : 'geral – 30 dias desde a coleta'})
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{alerta.nivelAlerta}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
          {alertasResultadoBiopsia.length > 10 && (
            <p className="text-xs text-gray-500 mt-2">
              + {alertasResultadoBiopsia.length - 10} outro(s). Acesse Solicitações para ver todos.
            </p>
          )}
        </div>
      )}

      {/* Notificações do perfil Autorizador - destaque no topo */}
      {isAutorizador && notificacoesAutorizador && (
        <div className="bg-white rounded-lg shadow p-3 border-l-4 border-purple-500">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-2">
            <Bell className="text-purple-600" size={14} />
            Notificações do Autorizador
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-purple-50 rounded-lg p-2">
              <h3 className="text-xs font-medium text-purple-900 mb-1">APACs Pendentes de Registro</h3>
              <p className="text-lg font-bold text-purple-700">{notificacoesAutorizador.totalApacsPendentes}</p>
              <p className="text-[10px] text-purple-600">Solicitações em andamento sem número APAC</p>
              {notificacoesAutorizador.apacsPendentes.length > 0 && (
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {notificacoesAutorizador.apacsPendentes.slice(0, 5).map((s: any) => (
                    <Link
                      key={s.id}
                      to={`/solicitacoes/${s.id}`}
                      className="block text-xs text-purple-800 hover:text-purple-900 truncate"
                    >
                      {s.numeroProtocolo} - {s.paciente?.nome}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <h3 className="text-xs font-medium text-blue-900 mb-1">Solicitações Registradas (últimos 7 dias)</h3>
              <p className="text-lg font-bold text-blue-700">{notificacoesAutorizador.totalSolicitacoesRecentes}</p>
              <p className="text-[10px] text-blue-600">Cadastradas recentemente</p>
              {notificacoesAutorizador.solicitacoesRecentes.length > 0 && (
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {notificacoesAutorizador.solicitacoesRecentes.slice(0, 5).map((s: any) => (
                    <Link
                      key={s.id}
                      to={`/solicitacoes/${s.id}`}
                      className="block text-xs text-blue-800 hover:text-blue-900 truncate"
                    >
                      {s.numeroProtocolo} - {s.paciente?.nome}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Link
            to="/solicitacoes"
            className="inline-block mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Ver todas as solicitações →
          </Link>
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.title} className="bg-white rounded-lg shadow p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">{card.title}</p>
                  <p className="text-lg font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`${card.bgColor} p-2 rounded-lg`}>
                  <Icon className={card.color} size={18} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Indicadores de Desempenho</h2>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-600">Taxa de Conclusão</p>
              <p className="text-lg font-bold text-primary-600">
                {estatisticas?.indicadores.taxaConclusao.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Tempo Médio de Conclusão</p>
              <p className="text-lg font-bold text-primary-600">
                {estatisticas?.indicadores.tempoMedioConclusaoDias.toFixed(1)} dias
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Distribuição por Tipo</h2>
          <div className="space-y-1.5">
            {Object.entries(estatisticas?.porTipo || {}).map(([tipo, count]) => (
              <div key={tipo} className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{tipo === 'GERAL' ? 'Geral' : 'Oncológico'}</span>
                <span className="text-sm font-semibold text-gray-900">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Evolução Temporal (30 dias)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="data" 
                tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                style={{ fontSize: '11px' }}
              />
              <YAxis style={{ fontSize: '11px' }} />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy')}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="total" stroke="#0ea5e9" name="Total" />
              <Line type="monotone" dataKey="concluidas" stroke="#10b981" name="Concluídas" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Status das Solicitações</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { name: 'Pendentes', value: estatisticas?.porStatus.pendentes || 0 },
              { name: 'Em Andamento', value: estatisticas?.porStatus.emAndamento || 0 },
              { name: 'Concluídas', value: estatisticas?.porStatus.concluidas || 0 },
              { name: 'Vencidas', value: estatisticas?.porStatus.vencidas || 0 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{ fontSize: '11px' }} />
              <YAxis style={{ fontSize: '11px' }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alertas de APAC Próximas do Vencimento */}
      {apacsProximasVencimento.length > 0 && (
        <div className="bg-white rounded-lg shadow p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <FileCheck className="text-purple-600" size={14} />
              APACs Próximas do Prazo
            </h2>
            <Link 
              to="/solicitacoes"
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Ver todas →
            </Link>
          </div>
          <div className="space-y-2">
            {apacsProximasVencimento.slice(0, 10).map((apac) => {
              // Formatar competência: YYYYMM -> MM/YYYY
              if (!apac.competenciaFimApac || apac.diasRestantesCompetenciaApac === null) return null
              const competenciaFormatada = `${apac.competenciaFimApac.slice(4, 6)}/${apac.competenciaFimApac.slice(0, 4)}`
              const isVencida = apac.diasRestantesCompetenciaApac < 0
              const isUrgente = apac.diasRestantesCompetenciaApac <= 5
              const diasRestantes = apac.diasRestantesCompetenciaApac
              
              return (
                <Link
                  key={apac.id}
                  to={`/solicitacoes/${apac.id}`}
                  className={`block border-l-4 p-2 rounded-r-lg transition-colors ${
                    isVencida
                      ? 'border-red-500 bg-red-50 hover:bg-red-100'
                      : isUrgente
                      ? 'border-orange-500 bg-orange-50 hover:bg-orange-100'
                      : 'border-purple-500 bg-purple-50 hover:bg-purple-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-xs text-gray-900 truncate">
                          {apac.numeroProtocolo}
                        </p>
                        {isVencida && (
                          <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-red-200 text-red-800 whitespace-nowrap">
                            VENCIDA
                          </span>
                        )}
                        {isUrgente && !isVencida && (
                          <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-orange-200 text-orange-800 whitespace-nowrap">
                            URGENTE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">
                        APAC: {apac.numeroAutorizacaoApac || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {apac.paciente.nome} - {apac.oci.nome}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Comp. fim: {competenciaFormatada} | registro proc.
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className={`text-sm font-bold ${
                        isVencida
                          ? 'text-red-600'
                          : isUrgente
                          ? 'text-orange-600'
                          : 'text-purple-600'
                      }`}>
                        {isVencida
                          ? `${Math.abs(diasRestantes)} dia(s) após`
                          : `${diasRestantes} dia(s) rest.`
                        }
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
          {apacsProximasVencimento.length > 10 && (
            <div className="mt-2 text-center">
              <Link
                to="/solicitacoes"
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Ver mais {apacsProximasVencimento.length - 10} APAC(s) →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Alertas de Prazo para Registro de Procedimentos */}
      {solicitacoesProximasPrazoRegistro.length > 0 && (
        <div className="bg-white rounded-lg shadow p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Calendar className="text-orange-600" size={14} />
              Prazo para Registrar Procedimentos
            </h2>
            <Link 
              to="/solicitacoes?status=EM_ANDAMENTO"
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Ver todas →
            </Link>
          </div>
          <div className="space-y-2">
            {solicitacoesProximasPrazoRegistro.slice(0, 10).map((solicitacao) => {
              if (!solicitacao.competenciaFimApac) return null
              const competenciaFormatada = `${solicitacao.competenciaFimApac.slice(4, 6)}/${solicitacao.competenciaFimApac.slice(0, 4)}`
              const isVencida = solicitacao.diasRestantesPrazoRegistro < 0
              const isUrgente = solicitacao.diasRestantesPrazoRegistro <= 3
              const dataFim = new Date(solicitacao.dataFimValidadeApac)
              
              return (
                <Link
                  key={solicitacao.id}
                  to={`/solicitacoes/${solicitacao.id}`}
                  className={`block border-l-4 p-2 rounded-r-lg transition-colors ${
                    isVencida
                      ? 'border-red-500 bg-red-50 hover:bg-red-100'
                      : isUrgente
                      ? 'border-orange-500 bg-orange-50 hover:bg-orange-100'
                      : 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-xs text-gray-900 truncate">
                          {solicitacao.numeroProtocolo}
                        </p>
                        {isVencida && (
                          <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-red-200 text-red-800 whitespace-nowrap">
                            VENCIDO
                          </span>
                        )}
                        {isUrgente && !isVencida && (
                          <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-orange-200 text-orange-800 whitespace-nowrap">
                            URGENTE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">
                        {solicitacao.paciente.nome} - {solicitacao.oci.nome}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Último dia para registro: {format(dataFim, 'dd/MM/yyyy')} | Comp. fim: {competenciaFormatada}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className={`text-sm font-bold ${
                        isVencida
                          ? 'text-red-600'
                          : isUrgente
                          ? 'text-orange-600'
                          : 'text-yellow-600'
                      }`}>
                        {isVencida
                          ? `${Math.abs(solicitacao.diasRestantesPrazoRegistro)} dia(s) após`
                          : `${solicitacao.diasRestantesPrazoRegistro} dia(s)`
                        }
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
          {solicitacoesProximasPrazoRegistro.length > 10 && (
            <div className="mt-2 text-center">
              <Link
                to="/solicitacoes?status=EM_ANDAMENTO"
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Ver mais {solicitacoesProximasPrazoRegistro.length - 10} solicitação(ões) →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
