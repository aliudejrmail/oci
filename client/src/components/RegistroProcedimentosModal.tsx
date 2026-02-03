import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { X, CheckCircle, Calendar, Trash2 } from 'lucide-react'
import { getStatusExibicao } from '../utils/procedimento-display'

interface ProcedimentoExecucao {
  id: string
  procedimento: {
    id: string
    nome: string
    codigo: string
    tipo: string
  }
  status: string
  dataExecucao?: string | null
  dataAgendamento?: string | null
  resultadoBiopsia?: string | null
  dataColetaMaterialBiopsia?: string | null
  dataRegistroResultadoBiopsia?: string | null
}

/** Reconhece biópsia pelo nome (com ou sem acento: biópsia, biopsia). */
function isProcedimentoBiopsia(nome: string): boolean {
  const n = (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove todos os acentos (ó -> o)
  return n.includes('biopsia')
}

/** Consulta médica especializada (presencial ou teleconsulta): nome contém "consulta" e "especializada". */
function isConsultaMedicaEspecializada(nome: string): boolean {
  const n = (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return n.includes('consulta') && n.includes('especializada')
}

interface RegistroProcedimentosModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  solicitacaoId?: string
  execucoes: ProcedimentoExecucao[]
  /** Lista completa de execuções (para cálculo de status DISPENSADO). Se não informada, usa execucoes. */
  execucoesCompletas?: ProcedimentoExecucao[]
}

export default function RegistroProcedimentosModal({
  open,
  onClose,
  onSuccess,
  solicitacaoId: _solicitacaoId,
  execucoes,
  execucoesCompletas
}: RegistroProcedimentosModalProps) {
  const execucoesParaStatus = execucoesCompletas ?? execucoes
  const { usuario } = useAuth()
  const isAdmin = usuario?.tipo === 'ADMIN'
  const [procedimentos, setProcedimentos] = useState<Array<{
    execucaoId: string
    procedimentoId: string
    nome: string
    codigo: string
    tipo: string
    realizado: boolean
    /** Status da execução no backend: PENDENTE, AGENDADO, EXECUTADO, CANCELADO */
    status: string
    /** Data do agendamento (YYYY-MM-DD), quando status foi AGENDADO; usada para restringir a data de execução */
    dataAgendamento: string
    dataExecucao: string
    resultadoBiopsia: string
    dataColetaMaterialBiopsia: string
    dataRegistroResultadoBiopsia: string
    ehBiopsia: boolean
    /** true apenas quando a coleta já foi registrada no backend (não é valor pré-preenchido no form) */
    coletaRegistradaNoBackend: boolean
    /** true se for consulta médica em atenção especializada (presencial ou teleconsulta) */
    ehConsultaEspecializada: boolean
  }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [salvandoColeta, setSalvandoColeta] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  const hoje = new Date().toISOString().split('T')[0]
  const podeRegistrarPorData = (proc: (typeof procedimentos)[0]) => {
    if (!proc.dataAgendamento || proc.status !== 'AGENDADO') return true
    return hoje >= proc.dataAgendamento
  }

  useEffect(() => {
    if (!open) return

    // Inicializar procedimentos com dados atuais
    const procedimentosInicializados = execucoes.map((exec) => {
      const ehBiopsia = isProcedimentoBiopsia(exec.procedimento.nome)
      const hoje = new Date().toISOString().split('T')[0]
      // Data de coleta: só preencher se já foi registrada no backend; senão vazio (pendente de tudo)
      const dataColeta = exec.dataColetaMaterialBiopsia
        ? new Date(exec.dataColetaMaterialBiopsia).toISOString().split('T')[0]
        : ''
      const coletaRegistradaNoBackend = !!exec.dataColetaMaterialBiopsia
      // Data do resultado: só preencher se já existir no backend; senão deixar vazio
      const dataRegistro = exec.dataRegistroResultadoBiopsia
        ? new Date(exec.dataRegistroResultadoBiopsia).toISOString().split('T')[0]
        : ''
      const ehConsultaEspecializada = isConsultaMedicaEspecializada(exec.procedimento.nome)
      const dataAgendamentoStr = (exec as any).dataAgendamento
        ? new Date((exec as any).dataAgendamento).toISOString().split('T')[0]
        : ''
      const ehAgendado = exec.status === 'AGENDADO'
      return {
        execucaoId: exec.id,
        procedimentoId: exec.procedimento.id,
        nome: exec.procedimento.nome,
        codigo: exec.procedimento.codigo,
        tipo: exec.procedimento.tipo,
        realizado: exec.status === 'EXECUTADO',
        status: exec.status || 'PENDENTE',
        dataAgendamento: dataAgendamentoStr,
        dataExecucao: exec.dataExecucao
          ? new Date(exec.dataExecucao).toISOString().split('T')[0]
          : ehAgendado && dataAgendamentoStr ? dataAgendamentoStr : hoje,
        resultadoBiopsia: (exec.resultadoBiopsia ?? '').toString(),
        dataColetaMaterialBiopsia: dataColeta,
        dataRegistroResultadoBiopsia: dataRegistro,
        ehBiopsia,
        coletaRegistradaNoBackend,
        ehConsultaEspecializada
      }
    })

    setProcedimentos(procedimentosInicializados)
    setErro(null)
    setSucesso(null)
  }, [open, execucoes])

  /** Pelo menos uma consulta médica especializada já está realizada (vindo do backend). */
  const consultaJaRealizada = execucoes.some(
    (e) => isConsultaMedicaEspecializada(e.procedimento.nome) && e.status === 'EXECUTADO'
  )

  const handleToggleRealizado = (index: number) => {
    const proc = procedimentos[index]
    const novos = [...procedimentos]
    // Agendamento em data futura: não permite registrar até a data do agendamento
    if (!proc.realizado && !podeRegistrarPorData(proc)) {
      const dataFmt = proc.dataAgendamento ? proc.dataAgendamento.split('-').reverse().join('/') : ''
      setErro(`O registro de realização do procedimento é permitido exclusivamente na data do agendamento (${dataFmt}) ou em caráter retroativo.`)
      return
    }
    // Consulta especializada: só permite marcar outros procedimentos após ela estar realizada
    if (!proc.realizado && !proc.ehConsultaEspecializada && !consultaJaRealizada) {
      setErro('O registro da consulta médica especializada deve ser realizado antes dos demais procedimentos. Registre primeiro a consulta médica (ou teleconsulta) em atenção especializada.')
      return
    }
    // Biópsia: só permite marcar como realizado se o resultado estiver registrado
    if (!proc.realizado && proc.ehBiopsia && !(proc.resultadoBiopsia ?? '').trim()) {
      setErro('Procedimentos de biópsia só podem ser assinalados como realizado após o registro do resultado. Preencha o campo "Resultado da biópsia" abaixo.')
      return
    }
    setErro(null)
    novos[index].realizado = !novos[index].realizado
    if (!novos[index].realizado) {
      novos[index].dataExecucao = ''
    } else if (!novos[index].dataExecucao) {
      // Procedimento agendado: usar a data do agendamento; caso contrário usar hoje
      novos[index].dataExecucao = novos[index].dataAgendamento || new Date().toISOString().split('T')[0]
    }
    setProcedimentos(novos)
  }

  const handleDataChange = (index: number, data: string) => {
    const novos = [...procedimentos]
    novos[index].dataExecucao = data
    setProcedimentos(novos)
  }

  const handleResultadoBiopsiaChange = (index: number, value: string) => {
    const novos = [...procedimentos]
    novos[index].resultadoBiopsia = value
    setProcedimentos(novos)
    if (erro) setErro(null)
  }

  const handleDataColetaMaterialChange = (index: number, value: string) => {
    const novos = [...procedimentos]
    novos[index].dataColetaMaterialBiopsia = value
    setProcedimentos(novos)
  }

  const handleDataRegistroResultadoChange = (index: number, value: string) => {
    const novos = [...procedimentos]
    novos[index].dataRegistroResultadoBiopsia = value
    setProcedimentos(novos)
  }

  /** Registra apenas a data de coleta; procedimento permanece pendente por aguardo de resultado. */
  const handleRegistrarColeta = async (index: number) => {
    const proc = procedimentos[index]
    if (!proc.ehBiopsia || !proc.dataColetaMaterialBiopsia) return

    setSalvandoColeta(proc.execucaoId)
    setErro(null)
    try {
      const dataColeta = proc.dataColetaMaterialBiopsia?.includes('T')
        ? proc.dataColetaMaterialBiopsia.split('T')[0]
        : proc.dataColetaMaterialBiopsia
      const [ac, mc, dc] = (dataColeta || '').split('-').map(Number)
      await api.patch(`/solicitacoes/execucoes/${proc.execucaoId}`, {
        dataColetaMaterialBiopsia: new Date(ac, mc - 1, dc, 12, 0, 0).toISOString()
      })
      setSucesso('Data de coleta registrada. Procedimento permanece pendente por aguardo de resultado.')
      setTimeout(() => {
        onSuccess?.()
        setSucesso(null)
      }, 2000)
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao registrar data de coleta.')
    } finally {
      setSalvandoColeta(null)
    }
  }

  const handleExcluirExecucao = async (execucaoId: string, index: number) => {
    if (!isAdmin) return
    
    if (!window.confirm('Tem certeza que deseja remover a data de realização deste procedimento? O procedimento voltará ao status pendente.')) {
      return
    }

    setExcluindo(execucaoId)
    setErro(null)
    
    try {
      // Reverter para PENDENTE - remove apenas a data de realização, mantém o procedimento
      await api.patch(`/solicitacoes/execucoes/${execucaoId}`, {
        status: 'PENDENTE',
        dataExecucao: null
      })
      
      // Atualizar o estado local - marcar como não realizado
      const novos = [...procedimentos]
      novos[index].realizado = false
      novos[index].dataExecucao = ''
      setProcedimentos(novos)
      
      setSucesso('Data de realização removida. Procedimento voltou ao status pendente.')
      setTimeout(() => {
        onSuccess?.()
        setSucesso(null)
      }, 1500)
    } catch (error: any) {
      console.error('Erro ao remover data de realização:', error)
      setErro(error.response?.data?.message || 'Erro ao remover data de realização.')
    } finally {
      setExcluindo(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setSucesso(null)

    const procedimentosRealizados = procedimentos.filter(p => p.realizado)
    const consultaJaRealizadaSubmit = execucoes.some(
      (e) => isConsultaMedicaEspecializada(e.procedimento.nome) && e.status === 'EXECUTADO'
    )
    const outrosRealizadosSemConsulta = procedimentosRealizados.some((p) => !p.ehConsultaEspecializada) && !consultaJaRealizadaSubmit
    if (outrosRealizadosSemConsulta) {
      setErro('O registro da consulta médica especializada deve ser realizado antes dos demais procedimentos. Registre primeiro a consulta médica (ou teleconsulta) em atenção especializada.')
      return
    }

    // Permitir salvar apenas data(s) de coleta (biópsia) sem marcar nenhum como realizado
    if (procedimentosRealizados.length === 0) {
      const comColeta = procedimentos.filter(p => p.ehBiopsia && p.dataColetaMaterialBiopsia)
      if (comColeta.length > 0) {
        setSubmitting(true)
        try {
          const promises = comColeta.map(proc => {
            const dataColeta = proc.dataColetaMaterialBiopsia?.includes('T')
              ? proc.dataColetaMaterialBiopsia.split('T')[0]
              : proc.dataColetaMaterialBiopsia
            const [ac, mc, dc] = (dataColeta || '').split('-').map(Number)
            return api.patch(`/solicitacoes/execucoes/${proc.execucaoId}`, {
              dataColetaMaterialBiopsia: new Date(ac, mc - 1, dc, 12, 0, 0).toISOString()
            })
          })
          await Promise.all(promises)
          setSucesso('Data(s) de coleta registrada(s). Procedimentos permanecem pendentes por aguardo de resultado.')
          setTimeout(() => {
            onSuccess?.()
            onClose()
          }, 2000)
        } catch (error: any) {
          setErro(error.response?.data?.message || 'Erro ao registrar data(s) de coleta.')
        } finally {
          setSubmitting(false)
        }
        return
      }
      setErro('Selecione pelo menos um procedimento como realizado ou preencha a data de coleta de biópsia para registrar (procedimento permanecerá pendente por aguardo de resultado).')
      return
    }

    // Validar que todos os procedimentos marcados têm data
    const semData = procedimentosRealizados.find(p => !p.dataExecucao)
    if (semData) {
      setErro('Todos os procedimentos marcados como realizados devem ter uma data de execução.')
      return
    }

    // Data de execução: entre data do agendamento e hoje (registro na data ou tardiamente)
    const dataForaDoPermitido = procedimentosRealizados.find((p) => {
      if (!p.dataExecucao) return false
      if (p.dataAgendamento && p.dataExecucao < p.dataAgendamento) return true
      if (p.dataExecucao > hoje) return true
      return false
    })
    if (dataForaDoPermitido) {
      setErro('A data de execução deve ser igual ou posterior à data do agendamento e não pode ser futura (até hoje).')
      return
    }

    // Biópsia: exige resultado registrado antes de marcar como realizado
    const biopsiaSemResultado = procedimentosRealizados.find(p => p.ehBiopsia && !(p.resultadoBiopsia ?? '').trim())
    if (biopsiaSemResultado) {
      setErro('Procedimentos de biópsia só podem ser assinalados como realizado após o registro do resultado. Preencha o campo "Resultado da biópsia".')
      return
    }

    setSubmitting(true)
    try {
      const promises = procedimentosRealizados.map(proc => {
        const dataFormatada = proc.dataExecucao.includes('T')
          ? proc.dataExecucao.split('T')[0]
          : proc.dataExecucao
        const [ano, mes, dia] = dataFormatada.split('-').map(Number)
        const dataLocal = new Date(ano, mes - 1, dia, 12, 0, 0)

        const payload: Record<string, unknown> = {
          status: 'EXECUTADO',
          dataExecucao: dataLocal.toISOString()
        }
        if (proc.ehBiopsia && (proc.resultadoBiopsia ?? '').trim()) {
          payload.resultadoBiopsia = proc.resultadoBiopsia.trim()
          const dataColeta = proc.dataColetaMaterialBiopsia?.includes('T')
            ? proc.dataColetaMaterialBiopsia.split('T')[0]
            : proc.dataColetaMaterialBiopsia
          if (dataColeta) {
            const [ac, mc, dc] = dataColeta.split('-').map(Number)
            payload.dataColetaMaterialBiopsia = new Date(ac, mc - 1, dc, 12, 0, 0).toISOString()
          }
          const dataReg = proc.dataRegistroResultadoBiopsia?.includes('T')
            ? proc.dataRegistroResultadoBiopsia.split('T')[0]
            : proc.dataRegistroResultadoBiopsia
          if (dataReg) {
            const [ar, mr, dr] = dataReg.split('-').map(Number)
            payload.dataRegistroResultadoBiopsia = new Date(ar, mr - 1, dr, 12, 0, 0).toISOString()
          }
        }

        return api.patch(`/solicitacoes/execucoes/${proc.execucaoId}`, payload)
      })

      // Também atualizar procedimentos que foram desmarcados (se estavam como EXECUTADO)
      const procedimentosDesmarcados = procedimentos.filter(
        p => !p.realizado && execucoes.find(e => e.id === p.execucaoId)?.status === 'EXECUTADO'
      )

      const promisesDesmarcar = procedimentosDesmarcados.map(proc =>
        api.patch(`/solicitacoes/execucoes/${proc.execucaoId}`, {
          status: 'PENDENTE',
          dataExecucao: null
        })
      )

      await Promise.all([...promises, ...promisesDesmarcar])

      setSucesso(`${procedimentosRealizados.length} procedimento(s) registrado(s) como realizado(s)!`)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (error: any) {
      console.error('Erro ao registrar procedimentos:', error)
      setErro(error.response?.data?.message || 'Erro ao registrar procedimentos.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded">
              <CheckCircle className="text-blue-600" size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Registrar Procedimentos Executados</h2>
              <p className="text-xs text-gray-500">Marque os procedimentos realizados e informe a data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            disabled={submitting}
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3">
          {/* Mensagens de erro e sucesso */}
          {erro && (
            <div className="p-2 bg-red-50 border border-red-200 rounded mb-2">
              <p className="text-xs text-red-800">{erro}</p>
            </div>
          )}

          {sucesso && (
            <div className="p-2 bg-green-50 border border-green-200 rounded mb-2">
              <p className="text-xs text-green-800">{sucesso}</p>
            </div>
          )}

          {!consultaJaRealizada && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded mb-2">
              <p className="text-xs text-amber-800">
                O registro da consulta especializada ou teleconsulta é pré-requisito obrigatório para seguir com o registro dos demais procedimentos.
              </p>
            </div>
          )}

          {/* Lista de Procedimentos */}
          <div className="space-y-2">
            {procedimentos.map((proc, index) => {
              const execucao = execucoesParaStatus.find((e) => e.id === proc.execucaoId)
              const statusExibicao = execucao ? getStatusExibicao(execucao, execucoesParaStatus) : proc.status
              const dispensado = statusExibicao === 'DISPENSADO'
              return (
              <div
                key={proc.execucaoId}
                className={`border rounded p-2 transition-colors ${
                  proc.realizado
                    ? 'border-green-300 bg-green-50'
                    : dispensado
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* Checkbox - desabilitado quando dispensado */}
                  <div className="flex items-center pt-0.5">
                    <input
                      type="checkbox"
                      id={`proc-${proc.execucaoId}`}
                      checked={proc.realizado}
                      onChange={() => handleToggleRealizado(index)}
                      disabled={
                        submitting ||
                        dispensado ||
                        !podeRegistrarPorData(proc) ||
                        (proc.ehBiopsia && !(proc.resultadoBiopsia ?? '').trim()) ||
                        (!proc.ehConsultaEspecializada && !consultaJaRealizada)
                      }
                      title={
                        dispensado
                          ? 'Dispensado: outra consulta/teleconsulta já foi realizada'
                          : !podeRegistrarPorData(proc)
                            ? `O registro de realização do procedimento é permitido exclusivamente na data do agendamento (${proc.dataAgendamento ? proc.dataAgendamento.split('-').reverse().join('/') : ''}) ou em caráter retroativo.`
                            : !proc.ehConsultaEspecializada && !consultaJaRealizada
                              ? 'Consulta especializada ou teleconsulta é pré-requisito obrigatório'
                              : proc.ehBiopsia && !(proc.resultadoBiopsia ?? '').trim()
                                ? 'Preencha o resultado da biópsia abaixo para poder marcar como realizado'
                                : undefined
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>

                  {/* Informações do Procedimento */}
                  <div className="flex-1 min-w-0">
                    {/* Nome e código do procedimento */}
                    <div className="flex items-center gap-2 mb-0">
                      <span className="flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-700 rounded-full font-medium text-xs shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <label
                          htmlFor={`proc-${proc.execucaoId}`}
                          className="text-xs font-medium text-gray-900 cursor-pointer block"
                        >
                          {proc.nome}
                        </label>
                        <p className="text-[10px] text-gray-500">
                          {proc.tipo} - {proc.codigo}
                        </p>
                      </div>
                    </div>

                    {/* Aviso quando agendamento é em data futura: não permite registrar até a data */}
                    {proc.status === 'AGENDADO' && proc.dataAgendamento && !podeRegistrarPorData(proc) && (
                      <p className="text-[10px] text-amber-700 mt-1 ml-8 pl-3 border-l-2 border-amber-300 bg-amber-50/80 rounded-r py-1 pr-2">
                        O registro de realização do procedimento é permitido exclusivamente na data do agendamento ({proc.dataAgendamento.split('-').reverse().join('/')}) ou em caráter retroativo.
                      </p>
                    )}

                    {/* Resultado da biópsia: exibido logo abaixo do procedimento (não na parte inferior do modal) */}
                    {proc.ehBiopsia && (
                      <div
                        className="mt-2 ml-8 pl-3 border-l-2 border-blue-200 bg-blue-50/50 rounded-r py-2 pr-2 space-y-1.5"
                        aria-label={`Resultado do procedimento: ${proc.nome}`}
                      >
                        <label className="block text-xs font-medium text-gray-700">
                          Resultado da biópsia <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={proc.resultadoBiopsia}
                          onChange={(e) => handleResultadoBiopsiaChange(index, e.target.value)}
                          placeholder="Registre o resultado (laudo, conclusão) antes de marcar como realizado"
                          rows={2}
                          disabled={submitting}
                          className="w-full text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 px-2 py-1.5 bg-white"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-600 mb-0.5">Data de coleta de material para biópsia</label>
                            <div className="relative">
                              <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
                              <input
                                type="date"
                                value={proc.dataColetaMaterialBiopsia}
                                onChange={(e) => handleDataColetaMaterialChange(index, e.target.value)}
                                disabled={submitting}
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-600 mb-0.5">Data do resultado</label>
                            <div className="relative">
                              <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
                              <input
                                type="date"
                                value={proc.dataRegistroResultadoBiopsia}
                                onChange={(e) => handleDataRegistroResultadoChange(index, e.target.value)}
                                disabled={submitting}
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                              />
                            </div>
                          </div>
                        </div>
                        {!(proc.resultadoBiopsia ?? '').trim() && (
                          <p className="text-[10px] text-amber-700">Preencha o resultado acima para poder marcar como realizado.</p>
                        )}
                        {/* Registrar só a coleta: procedimento permanece pendente por aguardo de resultado */}
                        {proc.dataColetaMaterialBiopsia && !(proc.resultadoBiopsia ?? '').trim() && !proc.realizado && (
                          <div className="pt-1 border-t border-blue-200/50 mt-1.5">
                            <button
                              type="button"
                              onClick={() => handleRegistrarColeta(index)}
                              disabled={submitting || salvandoColeta === proc.execucaoId}
                              className="text-xs px-2 py-1.5 rounded border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Mantém o procedimento pendente por aguardo de resultado"
                            >
                              {salvandoColeta === proc.execucaoId ? (
                                <span className="inline-flex items-center gap-1">
                                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></span>
                                  Salvando...
                                </span>
                              ) : (
                                'Registrar data de coleta (pendente – aguardando resultado)'
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Data de execução (visível apenas se marcado como realizado) */}
                    {proc.realizado && (
                      <div className="mt-1.5 ml-8">
                        <label
                          htmlFor={`data-${proc.execucaoId}`}
                          className="block text-xs font-medium text-gray-700 mb-0.5"
                        >
                          Data de Execução <span className="text-red-500">*</span>
                          {proc.dataAgendamento && (
                            <span className="text-blue-600 font-normal ml-1">(data do agendamento)</span>
                          )}
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                          <input
                            type="date"
                            id={`data-${proc.execucaoId}`}
                            value={proc.dataExecucao}
                            onChange={(e) => handleDataChange(index, e.target.value)}
                            className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            disabled={submitting}
                            required
                            min={proc.dataAgendamento || undefined}
                            max={hoje}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Visual e Ações */}
                  <div className="text-right flex items-center gap-2 flex-wrap justify-end">
                    {(() => {
                      const execucao = execucoesParaStatus.find((e) => e.id === proc.execucaoId)
                      const statusExibicao = execucao ? getStatusExibicao(execucao, execucoesParaStatus) : proc.status
                      if (statusExibicao === 'EXECUTADO' || proc.realizado) {
                        return (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-800 flex items-center gap-0.5">
                            <CheckCircle size={10} />
                            REALIZADO
                          </span>
                        )
                      }
                      if (statusExibicao === 'DISPENSADO') {
                        return (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600" title="Dispensado: outra consulta/teleconsulta já foi realizada">
                            DISPENSADO
                          </span>
                        )
                      }
                      if (proc.status === 'AGENDADO') {
                        return (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-800 flex items-center gap-0.5">
                            <Calendar size={10} />
                            AGENDADO
                          </span>
                        )
                      }
                      if (proc.status === 'CANCELADO') {
                        return (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-800">
                            Cancelado
                          </span>
                        )
                      }
                      if (proc.ehBiopsia && proc.coletaRegistradaNoBackend && !(proc.resultadoBiopsia ?? '').trim()) {
                        return (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-800" title="Procedimento pendente por aguardo de resultado da biópsia">
                            Pendente – aguardando resultado
                          </span>
                        )
                      }
                      return (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-800">
                          PENDENTE
                        </span>
                      )
                    })()}
                    {/* Botão para remover data de realização (apenas admin, apenas se realizado) */}
                    {isAdmin && proc.realizado && (
                      <button
                        type="button"
                        onClick={() => handleExcluirExecucao(proc.execucaoId, index)}
                        disabled={submitting || excluindo === proc.execucaoId}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remover data de realização"
                      >
                        {excluindo === proc.execucaoId ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )})}
          </div>

          {/* Parte inferior do modal: apenas ações (resultados de biópsia ficam logo abaixo de cada procedimento acima) */}
          <div className="flex gap-2 pt-2 mt-2 border-t border-gray-200 sticky bottom-0 bg-white" role="group" aria-label="Ações do modal">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  Registrar Procedimentos
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
