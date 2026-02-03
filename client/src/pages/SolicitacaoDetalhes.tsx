import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, CheckCircle, AlertTriangle, Trash2, FileText, Download, Eye, FileCheck, Edit, Calendar, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import RegistroAutorizacaoApacModal from '../components/RegistroAutorizacaoApacModal'
import RegistroProcedimentosModal from '../components/RegistroProcedimentosModal'
import EditarSolicitacaoModal from '../components/EditarSolicitacaoModal'
import AgendarModal from '../components/AgendarModal'
import { getStatusExibicao } from '../utils/procedimento-display'

// Helper para formatar data sem problemas de timezone
// Converte string ISO para Date local considerando apenas a parte da data
const formatarDataSemTimezone = (dataString: string | Date | null | undefined): string => {
  if (!dataString) return ''
  
  let dataStr: string
  if (dataString instanceof Date) {
    // Se já for Date, extrair apenas a parte da data
    const ano = dataString.getFullYear()
    const mes = (dataString.getMonth() + 1).toString().padStart(2, '0')
    const dia = dataString.getDate().toString().padStart(2, '0')
    return `${dia}/${mes}/${ano}`
  } else {
    dataStr = dataString.toString()
  }
  
  // Extrair apenas a parte da data (YYYY-MM-DD) ignorando hora e timezone
  const partesData = dataStr.split('T')[0].split('-')
  if (partesData.length === 3) {
    const ano = parseInt(partesData[0], 10)
    const mes = parseInt(partesData[1], 10) - 1 // Mes é 0-indexed no JavaScript
    const dia = parseInt(partesData[2], 10)
    // Criar data local (sem timezone) usando o construtor Date(ano, mes, dia)
    const dataLocal = new Date(ano, mes, dia)
    return format(dataLocal, 'dd/MM/yyyy')
  }
  
  // Fallback: tentar parseISO do date-fns
  try {
    const dataParsed = parseISO(dataStr)
    const ano = dataParsed.getFullYear()
    const mes = dataParsed.getMonth()
    const dia = dataParsed.getDate()
    return format(new Date(ano, mes, dia), 'dd/MM/yyyy')
  } catch {
    return format(new Date(dataStr), 'dd/MM/yyyy')
  }
}

export default function SolicitacaoDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [solicitacao, setSolicitacao] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [excluindo, setExcluindo] = useState(false)
  const [modalAutorizacaoAberto, setModalAutorizacaoAberto] = useState(false)
  const [modalProcedimentosAberto, setModalProcedimentosAberto] = useState(false)
  const [modalAgendarAberto, setModalAgendarAberto] = useState(false)
  const [modalEditarAberto, setModalEditarAberto] = useState(false)
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false)
  const [justificativaCancelamento, setJustificativaCancelamento] = useState('')
  const [removendoAnexoId, setRemovendoAnexoId] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      carregarSolicitacao()
    }
  }, [id])

  const carregarSolicitacao = async () => {
    if (!id) {
      setLoading(false)
      return
    }
    try {
      const response = await api.get(`/solicitacoes/${id}`)
      const data = response?.data
      // Só aceitar como solicitação válida se tiver id/numeroProtocolo e dados mínimos (evita tela em branco por resposta inesperada)
      if (data && (data.id || data.numeroProtocolo) && (data.paciente || data.oci)) {
        setSolicitacao(data)
      } else {
        setSolicitacao(null)
      }
    } catch (error) {
      console.error('Erro ao carregar solicitação:', error)
      setSolicitacao(null)
    } finally {
      setLoading(false)
    }
  }

  const atualizarStatus = async (novoStatus: string, justificativa?: string) => {
    try {
      const body: { status: string; justificativaCancelamento?: string } = { status: novoStatus }
      if (novoStatus === 'CANCELADA' && justificativa?.trim()) {
        body.justificativaCancelamento = justificativa.trim()
      }
      await api.patch(`/solicitacoes/${id}/status`, body)
      if (novoStatus === 'EM_ANDAMENTO') {
        await carregarSolicitacao()
        setModalProcedimentosAberto(true)
      } else if (novoStatus === 'CANCELADA') {
        setModalCancelarAberto(false)
        setJustificativaCancelamento('')
        carregarSolicitacao()
      } else {
        carregarSolicitacao()
      }
    } catch (error: any) {
      const mensagem = error.response?.data?.message || 'Erro ao atualizar status.'
      alert(mensagem)
      console.error('Erro ao atualizar status:', error)
    }
  }

  const abrirModalCancelar = () => {
    const dataPrazo = solicitacao?.dataPrazo ? new Date(solicitacao.dataPrazo) : null
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    if (dataPrazo && dataPrazo < hoje) {
      setJustificativaCancelamento('Prazos não puderam ser cumpridos.')
    } else {
      setJustificativaCancelamento('')
    }
    setModalCancelarAberto(true)
  }

  const confirmarCancelamento = async () => {
    if (!justificativaCancelamento.trim()) {
      alert('Informe a justificativa do cancelamento.')
      return
    }
    await atualizarStatus('CANCELADA', justificativaCancelamento)
  }

  const excluirSolicitacao = async () => {
    if (!id) return
    if (!window.confirm('Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.')) {
      return
    }
    setExcluindo(true)
    try {
      await api.delete(`/solicitacoes/${id}`)
      navigate('/solicitacoes')
    } catch (error: any) {
      const mensagemErro = error.response?.data?.message || 'Erro ao excluir solicitação'
      alert(mensagemErro)
      console.error('Erro ao excluir solicitação:', error)
    } finally {
      setExcluindo(false)
    }
  }

  const visualizarAnexo = async (anexoId: string) => {
    try {
      const response = await api.get(`/solicitacoes/${id}/anexos/${anexoId}/download`, {
        responseType: 'blob'
      })
      
      // Criar blob URL e abrir em nova aba
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      
      // Limpar URL após 10 minutos para liberar memória
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 10 * 60 * 1000) // 10 minutos
    } catch (error: any) {
      console.error('Erro ao visualizar anexo:', error)
      alert(error.response?.data?.message || 'Erro ao visualizar documento')
    }
  }

  const baixarAnexo = async (anexoId: string, nomeOriginal: string) => {
    try {
      const response = await api.get(`/solicitacoes/${id}/anexos/${anexoId}/download`, {
        responseType: 'blob'
      })
      
      // Criar blob e fazer download
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = nomeOriginal
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Erro ao baixar anexo:', error)
      alert(error.response?.data?.message || 'Erro ao baixar documento')
    }
  }

  const removerAnexo = async (anexoId: string) => {
    if (!id) return
    if (!window.confirm('Remover este anexo? O arquivo será excluído da solicitação.')) return
    setRemovendoAnexoId(anexoId)
    try {
      await api.delete(`/solicitacoes/${id}/anexos/${anexoId}`)
      await carregarSolicitacao()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao remover anexo.')
    } finally {
      setRemovendoAnexoId(null)
    }
  }

  if (!id) {
    return (
      <div className="space-y-3">
        <button onClick={() => navigate('/solicitacoes')} className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1.5">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="text-center py-12">
          <p className="text-gray-500">Identificador da solicitação não informado.</p>
          <button onClick={() => navigate('/solicitacoes')} className="mt-4 text-primary-600 hover:text-primary-700">Voltar para lista</button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!solicitacao) {
    return (
      <div className="space-y-3">
        <button onClick={() => navigate('/solicitacoes')} className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1.5">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="text-center py-12">
          <p className="text-gray-500">Solicitação não encontrada ou você não tem permissão para visualizá-la.</p>
          <button onClick={() => navigate('/solicitacoes')} className="mt-4 text-primary-600 hover:text-primary-700">Voltar para lista</button>
        </div>
      </div>
    )
  }

  const alerta = solicitacao.alerta

  return (
    <div className="space-y-3">
      <button
        onClick={() => navigate('/solicitacoes')}
        className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <div className="bg-white rounded-lg shadow p-3">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{solicitacao.numeroProtocolo}</h1>
            <p className="text-xs text-gray-600 mt-0.5">Detalhes da solicitação</p>
          </div>
          {alerta && (
            <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
              alerta.nivelAlerta === 'CRITICO' 
                ? 'bg-red-50 text-red-700'
                : alerta.nivelAlerta === 'ATENCAO'
                ? 'bg-orange-50 text-orange-700'
                : 'bg-blue-50 text-blue-700'
            }`}>
              <AlertTriangle size={14} />
              <span className="font-medium text-xs">
                {alerta.diasRestantes < 0 
                  ? `${Math.abs(alerta.diasRestantes)} dias vencido(s)`
                  : `${alerta.diasRestantes} dia(s) restante(s)`
                }
                {solicitacao.dataFimValidadeApac && (
                  <span className="opacity-90 ml-0.5">(registro proc.)</span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-0.5">Paciente</h3>
            <p className="text-sm font-medium text-gray-900">{solicitacao.paciente?.nome ?? '–'}</p>
            <p className="text-xs text-gray-600">CPF: {solicitacao.paciente?.cpf ?? '–'}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-0.5">OCI</h3>
            <p className="text-sm font-medium text-gray-900 truncate" title={solicitacao.oci?.nome}>{solicitacao.oci?.nome ?? '–'}</p>
            <p className="text-xs text-gray-600">Cód: {solicitacao.oci?.codigo ?? '–'}</p>
            <p className="text-xs text-gray-600">
              Tipo: {solicitacao.oci?.tipo === 'GERAL' ? 'Geral (60d)' : solicitacao.oci?.tipo === 'ONCOLOGICO' ? 'Oncológico (30d)' : '–'}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-0.5">Status</h3>
            <p className="text-sm font-medium text-gray-900">{solicitacao.status}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-0.5">Data de Cadastro</h3>
            <p className="text-sm font-medium text-gray-900">
              {solicitacao.dataSolicitacao ? format(new Date(solicitacao.dataSolicitacao), "dd/MM/yyyy 'às' HH:mm") : '–'}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-0.5">Dt. Autorização APAC</h3>
            <p className="text-sm font-medium text-gray-900">
              {solicitacao.dataAutorizacaoApac 
                ? formatarDataSemTimezone(solicitacao.dataAutorizacaoApac)
                : <span className="text-gray-400 italic text-xs">Não informado</span>
              }
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-0.5">Prazo</h3>
            {solicitacao.dataFimValidadeApac ? (
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  Registro proc.: {formatarDataSemTimezone(solicitacao.dataFimValidadeApac)}
                </p>
                {alerta && (
                  <p className={`text-xs ${alerta.diasRestantes < 0 ? 'text-red-600 font-medium' : 'text-orange-600'}`}>
                    {alerta.diasRestantes < 0 ? `${Math.abs(alerta.diasRestantes)}d venc.` : `${alerta.diasRestantes}d rest.`} (registro)
                  </p>
                )}
                {solicitacao.prazoApresentacaoApac && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Apres. APAC: {formatarDataSemTimezone(solicitacao.prazoApresentacaoApac)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm font-medium text-gray-900">
                {solicitacao.dataPrazo ? formatarDataSemTimezone(solicitacao.dataPrazo) : '–'}
                {alerta && (
                  <span className={`ml-1 text-xs ${alerta.diasRestantes < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    ({alerta.diasRestantes < 0 ? `${Math.abs(alerta.diasRestantes)}d venc.` : `${alerta.diasRestantes}d rest.`})
                  </span>
                )}
              </p>
            )}
          </div>
          {solicitacao.dataConclusao && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-0.5">Data de Conclusão</h3>
              <p className="text-sm font-medium text-gray-900">
                {format(new Date(solicitacao.dataConclusao), "dd/MM/yyyy 'às' HH:mm")}
              </p>
            </div>
          )}
        </div>

        {solicitacao.observacoes && (
          <div className="mb-3">
            <h3 className="text-xs font-medium text-gray-500 mb-0.5">Observações</h3>
            <p className="text-xs text-gray-900">{solicitacao.observacoes}</p>
          </div>
        )}

        {/* Card Validade APAC - 1 ou 2 Competências (Portaria SAES 1640/2024) */}
        {solicitacao.dataInicioValidadeApac && solicitacao.competenciaInicioApac && solicitacao.competenciaFimApac && (
          <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            {solicitacao.competenciaFimApac === solicitacao.competenciaInicioApac ? (
              <h3 className="text-xs font-semibold text-amber-900 mb-2">Validade APAC - mesma competência</h3>
            ) : (
              <h3 className="text-xs font-semibold text-amber-900 mb-2">Validade APAC - 2 Competências</h3>
            )}
            <p className="text-[10px] text-amber-700 mb-2">
              Data do 1º procedimento: {formatarDataSemTimezone(solicitacao.dataInicioValidadeApac)}
              {solicitacao.competenciaFimApac === solicitacao.competenciaInicioApac && (
                <span className="block mt-0.5 text-amber-600">
                  Procedimentos realizados no mesmo mês → prazo de apresentação na mesma competência.
                </span>
              )}
              {solicitacao.competenciaFimApac !== solicitacao.competenciaInicioApac && (
                <span className="block mt-0.5 text-amber-600">
                  Ex.: 04/12 ou 20/12 → competência de apresentação e data limite são os mesmos (Portarias MS)
                </span>
              )}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-amber-600 font-medium">1ª competência:</span>{' '}
                {solicitacao.competenciaInicioApac.slice(4, 6)}/{solicitacao.competenciaInicioApac.slice(0, 4)}
              </div>
              <div>
                <span className="text-amber-600 font-medium">
                  {solicitacao.competenciaFimApac === solicitacao.competenciaInicioApac
                    ? 'Competência de apresentação (mesma):'
                    : 'Competência de apresentação (2ª competência):'}{' '}
                </span>
                {solicitacao.competenciaFimApac.slice(4, 6)}/{solicitacao.competenciaFimApac.slice(0, 4)}
              </div>
              <div>
                <span className="text-orange-600 font-medium">Data limite para registro de procedimentos:</span>{' '}
                {solicitacao.dataFimValidadeApac 
                  ? formatarDataSemTimezone(solicitacao.dataFimValidadeApac)
                  : (() => {
                      const ano = parseInt(solicitacao.competenciaFimApac.slice(0, 4), 10)
                      const mes = parseInt(solicitacao.competenciaFimApac.slice(4, 6), 10)
                      const ultimoDia = new Date(ano, mes, 0)
                      return formatarDataSemTimezone(ultimoDia)
                    })()
                }
                <span className="text-amber-600 ml-1">
                  {solicitacao.oci?.tipo === 'ONCOLOGICO'
                    ? '(oncológica: 30 dias desde o 1º procedimento – consulta – ou fim da 2ª competência, o que vier primeiro)'
                    : '(último dia da competência de apresentação)'}
                </span>
              </div>
              <div>
                <span className="text-purple-600 font-medium">Prazo de apresentação APAC:</span>{' '}
                {solicitacao.prazoApresentacaoApac 
                  ? formatarDataSemTimezone(solicitacao.prazoApresentacaoApac)
                  : '-'
                }
                <span className="text-amber-600 ml-1">(5º dia útil do mês seguinte à competência de apresentação)</span>
              </div>
            </div>
          </div>
        )}

        {/* Informações da Autorização APAC */}
        {solicitacao.numeroAutorizacaoApac && (
          <div className="mb-3 p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="text-xs font-medium text-purple-900 mb-2 flex items-center gap-1.5">
              <FileCheck size={14} />
              Autorização APAC
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-purple-600 mb-0.5">Nº Autorização</p>
                <p className="text-xs font-medium text-purple-900">{solicitacao.numeroAutorizacaoApac}</p>
              </div>
              {solicitacao.nomeProfissionalAutorizador && (
                <div>
                  <p className="text-xs text-purple-600 mb-0.5">Profissional</p>
                  <p className="text-xs font-medium text-purple-900 truncate" title={solicitacao.nomeProfissionalAutorizador}>{solicitacao.nomeProfissionalAutorizador}</p>
                </div>
              )}
              {solicitacao.cnsProfissionalAutorizador && (
                <div>
                  <p className="text-xs text-purple-600 mb-0.5">CNS</p>
                  <p className="text-xs font-medium text-purple-900">{solicitacao.cnsProfissionalAutorizador}</p>
                </div>
              )}
              {solicitacao.dataAutorizacaoApac && (
                <div>
                  <p className="text-xs text-purple-600 mb-0.5">Data Autorização</p>
                  <p className="text-xs font-medium text-purple-900">
                    {formatarDataSemTimezone(solicitacao.dataAutorizacaoApac)}
                  </p>
                </div>
              )}
              {solicitacao.competenciaInicioApac && (
                <div>
                  <p className="text-xs text-purple-600 mb-0.5">Comp. Início</p>
                  <p className="text-xs font-medium text-purple-900">
                    {solicitacao.competenciaInicioApac.slice(4, 6)}/{solicitacao.competenciaInicioApac.slice(0, 4)}
                  </p>
                </div>
              )}
              {solicitacao.competenciaFimApac && (
                <div>
                  <p className="text-xs text-purple-600 mb-0.5">Comp. Fim</p>
                  <p className="text-xs font-medium text-purple-900">
                    {solicitacao.competenciaFimApac.slice(4, 6)}/{solicitacao.competenciaFimApac.slice(0, 4)}
                  </p>
                </div>
              )}
              {solicitacao.prazoApresentacaoApac && (
                <div>
                  <p className="text-xs text-purple-600 mb-0.5">Prazo Apresentação</p>
                  <p className="text-xs font-medium text-purple-900">
                    {formatarDataSemTimezone(solicitacao.prazoApresentacaoApac)}
                  </p>
                  <p className="text-xs text-purple-500 mt-0.5">(5º dia útil)</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 flex-wrap">
          {/* Editar: somente ADMIN e GESTOR - apenas se não estiver CONCLUIDA ou CANCELADA */}
          {(usuario?.tipo === 'ADMIN' || usuario?.tipo === 'GESTOR') && solicitacao.status !== 'CONCLUIDA' && solicitacao.status !== 'CANCELADA' && (
            <button
              onClick={() => setModalEditarAberto(true)}
              className="px-2.5 py-1.5 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 flex items-center gap-1.5"
            >
              <Edit size={14} />
              Editar
            </button>
          )}
          
          {/* Registrar APAC: apenas ADMIN e Autorizador */}
          {(usuario?.tipo === 'ADMIN' || usuario?.tipo === 'AUTORIZADOR') && (
            <button
              onClick={() => setModalAutorizacaoAberto(true)}
              className="px-2.5 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 flex items-center gap-1.5"
            >
              <FileCheck size={14} />
              {solicitacao.numeroAutorizacaoApac ? 'Editar APAC' : 'Registrar APAC'}
            </button>
          )}
          {/* Autorizador: apenas Registrar APAC (sem outras ações) */}
          {usuario?.tipo === 'AUTORIZADOR' ? null : (
            <>
              {solicitacao.status !== 'CONCLUIDA' && solicitacao.status !== 'CANCELADA' && (
                <>
                  {solicitacao.status === 'PENDENTE' && (
                    <button
                      onClick={() => atualizarStatus('EM_ANDAMENTO')}
                      className="px-2.5 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Iniciar Atendimento
                    </button>
                  )}
                  {solicitacao.status === 'EM_ANDAMENTO' && (
                    <>
                      {(usuario?.tipo !== 'EXECUTANTE' ||
                        (solicitacao.execucoes?.some((e: any) => e.status === 'AGENDADO') ?? false)) && (
                        <button
                          onClick={() => setModalAgendarAberto(true)}
                          className="px-2.5 py-1.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 flex items-center gap-1.5"
                        >
                          <Calendar size={14} />
                          {usuario?.tipo === 'EXECUTANTE' ? 'Reagendar' : 'Agendar'}
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await carregarSolicitacao()
                          setModalProcedimentosAberto(true)
                        }}
                        className="px-2.5 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center gap-1.5"
                      >
                        <CheckCircle size={14} />
                        Registrar Procedimentos
                      </button>
                      {usuario?.tipo !== 'EXECUTANTE' && (
                        <button
                          onClick={() => atualizarStatus('CONCLUIDA')}
                          className="px-2.5 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center gap-1.5"
                        >
                          <CheckCircle size={14} />
                          Marcar Concluída
                        </button>
                      )}
                    </>
                  )}
                  {/* Cancelar: apenas ADMIN e GESTOR — exige justificativa */}
                  {(usuario?.tipo === 'ADMIN' || usuario?.tipo === 'GESTOR') && (
                    <button
                      onClick={abrirModalCancelar}
                      className="px-2.5 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    >
                      Cancelar
                    </button>
                  )}
                </>
              )}
              {solicitacao.numeroAutorizacaoApac && solicitacao.status === 'EM_ANDAMENTO' && (usuario?.tipo === 'ADMIN' || usuario?.tipo === 'GESTOR') && (
                <button
                  onClick={() => {
                    const motivo = prompt('Informe o motivo de saída (1.1, 1.2, 1.4, 1.5, 4.1, 4.2, 4.3):')
                    if (motivo && ['1.1', '1.2', '1.4', '1.5', '4.1', '4.2', '4.3'].includes(motivo)) {
                      alert('Funcionalidade de encerramento APAC será implementada em breve')
                    }
                  }}
                  className="px-2.5 py-1.5 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 flex items-center gap-1.5"
                >
                  Encerrar APAC
                </button>
              )}
              {usuario?.tipo === 'ADMIN' && (
                <button
                  onClick={excluirSolicitacao}
                  disabled={excluindo}
                  className="px-2.5 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} />
                  {excluindo ? 'Excluindo...' : 'Excluir'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Anexos */}
      {solicitacao.anexos && solicitacao.anexos.length > 0 && (
        <div className="bg-white rounded-lg shadow p-3">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Documentos Anexados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {solicitacao.anexos.map((anexo: any) => {
              const tamanhoKB = (anexo.tamanhoBytes / 1024).toFixed(1)
              
              return (
                <div key={anexo.id} className="border border-gray-200 rounded-lg p-2 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-red-50 rounded-lg">
                      <FileText className="text-red-600" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs text-gray-900 truncate" title={anexo.nomeOriginal}>
                        {anexo.nomeOriginal}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {tamanhoKB} KB • {format(new Date(anexo.createdAt), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      onClick={() => visualizarAnexo(anexo.id)}
                      className="flex-1 min-w-0 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 flex items-center justify-center gap-1 font-medium transition-colors"
                    >
                      <Eye size={12} />
                      Visualizar
                    </button>
                    <button
                      onClick={() => baixarAnexo(anexo.id, anexo.nomeOriginal)}
                      className="flex-1 min-w-0 px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs hover:bg-gray-100 flex items-center justify-center gap-1 font-medium transition-colors"
                    >
                      <Download size={12} />
                      Baixar
                    </button>
                    {(usuario?.tipo === 'ADMIN' || usuario?.tipo === 'GESTOR') && (
                      <button
                        onClick={() => removerAnexo(anexo.id)}
                        disabled={removendoAnexoId === anexo.id}
                        className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 flex items-center justify-center gap-1 font-medium transition-colors disabled:opacity-50"
                        title="Remover anexo"
                      >
                        <Trash2 size={12} />
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Procedimentos - Executante vê apenas os agendados; demais perfis vêem todos */}
      <div className="bg-white rounded-lg shadow p-3">
        <h2 className="text-sm font-bold text-gray-900 mb-2">
          Procedimentos da OCI
          {usuario?.tipo === 'EXECUTANTE' && <span className="text-gray-500 font-normal text-xs ml-1">(apenas agendados)</span>}
        </h2>
        <div className="space-y-2">
          {((usuario?.tipo === 'EXECUTANTE'
            ? solicitacao.execucoes?.filter((e: any) => e.status === 'AGENDADO')
            : solicitacao.execucoes
          ) ?? []).length === 0 && usuario?.tipo === 'EXECUTANTE' ? (
            <p className="text-sm text-gray-500 py-3">Nenhum procedimento agendado para esta unidade no momento.</p>
          ) : (
          (usuario?.tipo === 'EXECUTANTE'
            ? solicitacao.execucoes?.filter((e: any) => e.status === 'AGENDADO')
            : solicitacao.execucoes
          )?.map((execucao: any, index: number) => {
            const statusExibicao = getStatusExibicao(execucao, solicitacao.execucoes ?? [])
            return (
            <div key={execucao.id} className="border border-gray-200 rounded-lg p-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-700 rounded-full font-medium text-xs">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-xs text-gray-900 truncate" title={execucao.procedimento.nome}>{execucao.procedimento.nome}</p>
                      <p className="text-xs text-gray-500">
                        {execucao.procedimento.tipo} - {execucao.procedimento.codigo}
                      </p>
                    </div>
                  </div>
                  {execucao.observacoes && (
                    <p className="text-xs text-gray-600 mt-1">{execucao.observacoes}</p>
                  )}
                </div>
                <div className="text-right ml-2">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${
                      statusExibicao === 'REALIZADO'
                        ? 'bg-green-100 text-green-800'
                        : statusExibicao === 'DISPENSADO'
                        ? 'bg-slate-100 text-slate-600'
                        : statusExibicao === 'AGENDADO'
                        ? 'bg-blue-100 text-blue-800'
                        : execucao.dataColetaMaterialBiopsia && !execucao.resultadoBiopsia
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                    title={execucao.dataColetaMaterialBiopsia && !execucao.resultadoBiopsia ? 'Procedimento pendente por aguardo de resultado da biópsia' : statusExibicao === 'DISPENSADO' ? 'Dispensado: outra consulta/teleconsulta já foi realizada' : undefined}
                  >
                    {statusExibicao === 'REALIZADO' && <CheckCircle size={10} />}
                    {statusExibicao === 'REALIZADO'
                      ? 'REALIZADO'
                      : statusExibicao === 'DISPENSADO'
                      ? 'DISPENSADO'
                      : execucao.dataColetaMaterialBiopsia && !execucao.resultadoBiopsia
                      ? 'Pendente – aguardando resultado'
                      : execucao.status}
                  </span>
                  {statusExibicao === 'REALIZADO' && (
                    <p className="text-xs text-gray-600 mt-0.5 font-medium">
                      {execucao.dataExecucao ? formatarDataSemTimezone(execucao.dataExecucao) : 'Data não informada'}
                    </p>
                  )}
                  {execucao.status === 'AGENDADO' && execucao.dataAgendamento && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      Agendado: {new Date(execucao.dataAgendamento).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      {execucao.unidadeExecutora && ` • ${execucao.unidadeExecutora}`}
                    </p>
                  )}
                  {execucao.dataColetaMaterialBiopsia && execucao.status !== 'REALIZADO' && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Coleta: {formatarDataSemTimezone(execucao.dataColetaMaterialBiopsia)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )})
          )}
        </div>
      </div>

      {/* Modal de Registro de Autorização APAC */}
      {id && (
        <RegistroAutorizacaoApacModal
          open={modalAutorizacaoAberto}
          onClose={() => setModalAutorizacaoAberto(false)}
          onSuccess={() => {
            carregarSolicitacao()
            setModalAutorizacaoAberto(false)
          }}
          solicitacaoId={id}
          dadosAtuais={{
            numeroAutorizacaoApac: solicitacao?.numeroAutorizacaoApac,
            nomeProfissionalAutorizador: solicitacao?.nomeProfissionalAutorizador,
            cnsProfissionalAutorizador: solicitacao?.cnsProfissionalAutorizador,
            dataAutorizacaoApac: solicitacao?.dataAutorizacaoApac,
            tipoOci: solicitacao?.oci?.tipo,
            motivoSaida: solicitacao?.motivoSaida,
            dataDiagnosticoCitoHistopatologico: solicitacao?.dataDiagnosticoCitoHistopatologico,
            cidPrincipal: solicitacao?.cidPrincipal,
            cidSecundario: solicitacao?.cidSecundario
          }}
        />
      )}

      {/* Modal de Registro de Procedimentos - Executante vê apenas os agendados */}
      {id && solicitacao?.execucoes && (
        <RegistroProcedimentosModal
          key={`modal-proc-${id}-${solicitacao.execucoes.map((e: any) => `${e.id}:${e.status}`).join(',')}`}
          open={modalProcedimentosAberto}
          onClose={() => setModalProcedimentosAberto(false)}
          onSuccess={() => {
            carregarSolicitacao()
            setModalProcedimentosAberto(false)
          }}
          solicitacaoId={id}
          execucoes={
            usuario?.tipo === 'EXECUTANTE'
              ? solicitacao.execucoes?.filter((e: any) => e.status === 'AGENDADO')
              : solicitacao.execucoes
          }
          execucoesCompletas={solicitacao.execucoes}
        />
      )}

      {/* Modal Agendar / Reagendar - Executante envia só procedimentos já agendados; unidade pré-preenchida e só campo Executante */}
      {id && solicitacao?.execucoes && (
        <AgendarModal
          open={modalAgendarAberto}
          onClose={() => setModalAgendarAberto(false)}
          onSuccess={() => {
            carregarSolicitacao()
            setModalAgendarAberto(false)
          }}
          solicitacaoId={id}
          execucoes={
            usuario?.tipo === 'EXECUTANTE'
              ? solicitacao.execucoes?.filter((e: any) => e.status === 'AGENDADO')
              : solicitacao.execucoes
          }
          tituloReagendamento={usuario?.tipo === 'EXECUTANTE'}
          unidadeExecutoraPreenchida={
            usuario?.tipo === 'EXECUTANTE' && usuario?.unidadeExecutante
              ? `${usuario.unidadeExecutante.cnes} - ${usuario.unidadeExecutante.nome}`
              : ''
          }
        />
      )}

      {/* Modal Editar Solicitação - usa id da URL para garantir mesma referência na PATCH */}
      {solicitacao && id && (
        <EditarSolicitacaoModal
          open={modalEditarAberto}
          onClose={() => setModalEditarAberto(false)}
          onSuccess={() => {
            carregarSolicitacao()
            setModalEditarAberto(false)
          }}
          solicitacao={solicitacao}
          solicitacaoId={id}
        />
      )}

      {/* Modal Cancelar solicitação — justificativa obrigatória */}
      {modalCancelarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Cancelar solicitação</h2>
              <button
                type="button"
                onClick={() => { setModalCancelarAberto(false); setJustificativaCancelamento('') }}
                className="p-1 rounded text-gray-500 hover:bg-gray-100"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600">
                O cancelamento só será efetivado após o preenchimento da justificativa. Se os prazos não puderam ser cumpridos, use ou complemente o texto sugerido abaixo.
              </p>
              <div>
                <label htmlFor="justificativa-cancelamento" className="block text-sm font-medium text-gray-700 mb-1">
                  Justificativa <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="justificativa-cancelamento"
                  value={justificativaCancelamento}
                  onChange={(e) => setJustificativaCancelamento(e.target.value)}
                  placeholder="Ex.: Prazos não puderam ser cumpridos; desistência do paciente; etc."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button
                type="button"
                onClick={() => { setModalCancelarAberto(false); setJustificativaCancelamento('') }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmarCancelamento}
                disabled={!justificativaCancelamento.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
