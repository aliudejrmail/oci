import { useRef, useState } from 'react'
type ConfirmJustificativaModalProps = {
  open: boolean
  onConfirm: (justificativa: string) => void
  onCancel: () => void
  title: string
  descricao: string
}
function ConfirmJustificativaModal({ open, onConfirm, onCancel, title, descricao }: ConfirmJustificativaModalProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [justificativa, setJustificativa] = useState('')
  const [erro, setErro] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm mb-3">{descricao}</p>
        <label className="block text-xs font-medium text-gray-700 mb-1">Justificativa <span className="text-red-500">*</span></label>
        <textarea
          ref={inputRef}
          value={justificativa}
          onChange={e => setJustificativa(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          required
        />
        {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
        <div className="flex gap-2 mt-4 justify-end">
          <button className="px-3 py-1 text-xs border rounded text-gray-700" onClick={onCancel}>Cancelar</button>
          <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded" onClick={() => {
            if (!justificativa.trim()) {
              setErro('Justificativa obrigatória.')
              inputRef.current?.focus()
              return
            }
            setErro('')
            onConfirm(justificativa)
          }}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}
import { useEffect } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Search, Plus, Trash2, X, Calendar, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react'
import { SearchableSelect } from './SearchableSelect'
import { getStatusExibicao, isProcedimentoAnatomoPatologico } from '../utils/procedimento-display'

interface ProcedimentoExecucao {
  id: string
  procedimento: {
    id: string
    nome: string
    codigo: string
    tipo: string
    obrigatorio?: boolean
  }
  status: string
  dataExecucao?: string | null
  dataAgendamento?: string | null
  resultadoBiopsia?: string | null
  dataColetaMaterialBiopsia?: string | null
  dataRegistroResultadoBiopsia?: string | null
  profissional?: string | null
  unidadeExecutoraId?: string | null
  unidadeExecutora?: string | null
}

interface ProfissionalOption {
  id: string
  nome: string
  cns: string
  cbo?: string
  cboRelacao?: {
    codigo: string
    descricao: string
  } | null
  unidades?: {
    unidade?: {
      id: string
      nome?: string
      cnes?: string
    } | null
  }[]
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
  /** Dados recém-carregados ao abrir (evita divergência com página de detalhes). */
  execucoesRecemCarregadas?: ProcedimentoExecucao[] | null
}

export default function RegistroProcedimentosModal({
  open,
  onClose,
  onSuccess,
  solicitacaoId,
  execucoes,
  execucoesCompletas,
  execucoesRecemCarregadas
}: RegistroProcedimentosModalProps) {
  const { usuario } = useAuth()
  /** Execuções vindas do fetch ao abrir (dados frescos) ou das props. */
  const [execucoesFrescas, setExecucoesFrescas] = useState<ProcedimentoExecucao[] | null>(null)
  const [carregandoExecucoes, setCarregandoExecucoes] = useState(false)

  useEffect(() => {
    if (!open || !solicitacaoId) {
      if (!open) setExecucoesFrescas(null)
      return
    }
    setCarregandoExecucoes(true)
    setExecucoesFrescas(null)
    api
      .get(`/solicitacoes/${solicitacaoId}`)
      .then((res) => {
        const execs = res?.data?.execucoes ?? []
        setExecucoesFrescas(execs)
      })
      .catch((err) => {
        console.warn('[Modal] Erro ao buscar execuções, usando dados do parent:', err?.response?.status)
        setExecucoesFrescas(null)
      })
      .finally(() => setCarregandoExecucoes(false))
  }, [open, solicitacaoId])

  /** Prioridade: fetch do modal > dados recém-carregados do parent > props. */
  const execucoesCompletasParaModal =
    execucoesFrescas ??
    (execucoesRecemCarregadas && execucoesRecemCarregadas.length > 0 ? execucoesRecemCarregadas : null) ??
    (execucoesCompletas?.length ? execucoesCompletas : execucoes)
  /** Para EXECUTANTE: exibir só AGENDADO; demais perfis: todos. */
  const execucoesParaModal =
    usuario?.tipo === 'EXECUTANTE'
      ? execucoesCompletasParaModal.filter((e) => e.status === 'AGENDADO').length > 0
        ? execucoesCompletasParaModal.filter((e) => e.status === 'AGENDADO')
        : execucoes
      : execucoesCompletasParaModal
  /** Lista completa para validação e status (sempre inclui REALIZADO/DISPENSADO). */
  const execucoesParaStatus = execucoesCompletasParaModal
  const isAdmin = usuario?.tipo === 'ADMIN'
  const [profissionais, setProfissionais] = useState<ProfissionalOption[]>([])
  const [carregandoProfissionais, setCarregandoProfissionais] = useState(false)
  const [procedimentos, setProcedimentos] = useState<Array<{
    execucaoId: string
    procedimentoId: string
    nome: string
    codigo: string
    tipo: string
    realizado: boolean
    /** Status da execução no backend: PENDENTE, AGENDADO, REALIZADO, CANCELADO */
    status: string
    /** Data do agendamento (YYYY-MM-DD), quando status foi AGENDADO; usada para restringir a data de execução */
    dataAgendamento: string
    dataExecucao: string
    unidadeExecutoraId: string
    unidadeExecutoraNome: string
    ehBiopsia: boolean
    /** true se for consulta médica em atenção especializada (presencial ou teleconsulta) */
    ehConsultaEspecializada: boolean
    /** true se for ANATOMO-PATOLÓGICO obrigatório (exige data coleta e data resultado) */
    ehAnatomoPatologicoObrigatorio: boolean
    resultadoBiopsia: string
    dataColetaMaterialBiopsia: string
    dataRegistroResultadoBiopsia: string
    medicoExecutante: string
    medicoExecutanteId?: string
  }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  const hoje = new Date().toISOString().split('T')[0]
  const podeRegistrarPorData = (proc: (typeof procedimentos)[0]) => {
    if (!proc.dataAgendamento || proc.status !== 'AGENDADO') return true
    return hoje >= proc.dataAgendamento
  }

  useEffect(() => {
    if (!open) return
    setCarregandoProfissionais(true)
    api
      .get('/profissionais?ativo=true&limit=200')
      .then((res) => {
        setProfissionais(res.data?.profissionais || [])
      })
      .catch((err) => {
        console.error('Erro ao carregar profissionais para registro de procedimentos:', err)
        setProfissionais([])
      })
      .finally(() => setCarregandoProfissionais(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    if (carregandoExecucoes) return

    // Usar lista completa para ter todos os procedimentos (inclui REALIZADO para consultaJaRealizada)
    const execucoesParaInicializar = execucoesParaStatus
    const idsExecucoesExibir = new Set(execucoesParaModal.map((e) => e.id))
    const procedimentosInicializados = execucoesParaInicializar
      .filter((exec) => idsExecucoesExibir.size === 0 || idsExecucoesExibir.has(exec.id))
      .map((exec) => {
        const ehBiopsia = isProcedimentoBiopsia(exec.procedimento.nome)
        const hoje = new Date().toISOString().split('T')[0]
        const ehConsultaEspecializada = isConsultaMedicaEspecializada(exec.procedimento.nome)
        const obrigatorio = (exec.procedimento as any).obrigatorio !== false
        const ehAnatomoPatologicoObrigatorio = obrigatorio && isProcedimentoAnatomoPatologico(exec.procedimento.nome)
        const dataColeta = exec.dataColetaMaterialBiopsia
          ? new Date(exec.dataColetaMaterialBiopsia).toISOString().split('T')[0]
          : ''
        const dataRegistro = exec.dataRegistroResultadoBiopsia
          ? new Date(exec.dataRegistroResultadoBiopsia).toISOString().split('T')[0]
          : ''
        const dataAgendamentoStr = (exec as any).dataAgendamento
          ? new Date((exec as any).dataAgendamento).toISOString().split('T')[0]
          : ''
        const ehAgendado = exec.status === 'AGENDADO'
        const unidadeExecutoraId = (exec as any).unidadeExecutoraId || ''
        // Resolve o nome da unidade pelo ID, se necessário
        let unidadeExecutoraNome = (exec as any).unidadeExecutora || '';
        if (unidadeExecutoraId && !unidadeExecutoraNome && Array.isArray(profissionais)) {
          const unidade = profissionais
            .flatMap(p => p.unidades || [])
            .find(u => u.unidade?.id === unidadeExecutoraId);
          if (unidade && unidade.unidade) {
            const nome = unidade.unidade.nome || unidade.unidade.id;
            const cnes = unidade.unidade.cnes;
            unidadeExecutoraNome = cnes ? `${cnes} - ${nome}` : nome;
          } else {
            unidadeExecutoraNome = '';
          }
        }
        return {
          execucaoId: exec.id,
          procedimentoId: exec.procedimento.id,
          nome: exec.procedimento.nome,
          codigo: exec.procedimento.codigo,
          tipo: exec.procedimento.tipo,
          realizado: exec.status === 'REALIZADO',
          status: exec.status || 'PENDENTE',
          dataAgendamento: dataAgendamentoStr,
          dataExecucao: exec.dataExecucao
            ? new Date(exec.dataExecucao).toISOString().split('T')[0]
            : ehAgendado && dataAgendamentoStr ? dataAgendamentoStr : hoje,
          unidadeExecutoraId,
          unidadeExecutoraNome,
          ehBiopsia,
          ehConsultaEspecializada,
          ehAnatomoPatologicoObrigatorio,
          resultadoBiopsia: (exec.resultadoBiopsia ?? '').toString(),
          dataColetaMaterialBiopsia: dataColeta,
          dataRegistroResultadoBiopsia: dataRegistro,
          medicoExecutante: (exec as any).profissional || '',
          medicoExecutanteId: (exec as any).executanteId || profissionais.find(p => p.nome === ((exec as any).profissional))?.id || ''
        }
      })

    setProcedimentos(procedimentosInicializados)
    setErro(null)
    setSucesso(null)
  }, [open, execucoes, execucoesCompletas, execucoesParaModal, execucoesParaStatus, carregandoExecucoes, profissionais])

  /** Pelo menos uma consulta/teleconsulta médica especializada já está realizada. Usa lista completa + fallback nos procedimentos do form. */
  const consultaJaRealizada =
    execucoesParaStatus.some(
      (e) => isConsultaMedicaEspecializada(e.procedimento.nome) && e.status === 'REALIZADO'
    ) || procedimentos.some((p) => p.ehConsultaEspecializada && p.realizado)

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
    // ANATOMO-PATOLÓGICO obrigatório: exige data de coleta e data de resultado antes de marcar como realizado
    if (!proc.realizado && proc.ehAnatomoPatologicoObrigatorio) {
      if (!proc.dataColetaMaterialBiopsia || !proc.dataRegistroResultadoBiopsia) {
        setErro('Para procedimentos anatomo-patológicos obrigatórios, é necessário informar a data de coleta de material e a data do resultado antes de marcar como realizado.')
        return
      }
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

  const handleDataColetaChange = (index: number, value: string) => {
    const novos = [...procedimentos]
    novos[index].dataColetaMaterialBiopsia = value
    setProcedimentos(novos)
    if (erro) setErro(null)
  }

  const handleDataResultadoChange = (index: number, value: string) => {
    const novos = [...procedimentos]
    novos[index].dataRegistroResultadoBiopsia = value
    setProcedimentos(novos)
    if (erro) setErro(null)
  }

  const handleMedicoExecutanteChange = (index: number, value: string) => {
    const novos = [...procedimentos]
    novos[index].medicoExecutante = value
    setProcedimentos(novos)
    if (erro) setErro(null)
  }

  const getProfissionaisDaUnidade = (unidadeId: string) => {
    if (!unidadeId) return [] as ProfissionalOption[]
    return profissionais.filter((p) =>
      p.unidades?.some((u) => u.unidade?.id === unidadeId)
    )
  }

  const [confirmJustificativa, setConfirmJustificativa] = useState<{ execucaoId: string, index: number, tipo: string } | null>(null)
  // Removido: const [justificativaValor, setJustificativaValor] = useState('')
  const handleExcluirExecucao = (execucaoId: string, index: number) => {
    if (!isAdmin) return
    setConfirmJustificativa({ execucaoId, index, tipo: 'remover' })
  }
  const confirmarExclusao = async (justificativa: string) => {
    if (!confirmJustificativa) return
    setExcluindo(confirmJustificativa.execucaoId)
    setErro(null)
    try {
      await api.patch(`/solicitacoes/execucoes/${confirmJustificativa.execucaoId}`, {
        status: 'PENDENTE',
        dataExecucao: null,
        justificativa
      })
      const novos = [...procedimentos]
      novos[confirmJustificativa.index].realizado = false
      novos[confirmJustificativa.index].dataExecucao = ''
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
      setConfirmJustificativa(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setSucesso(null)

    const procedimentosRealizados = procedimentos.filter(p => p.realizado)
    // Também incluir procedimentos anatomo-patológicos com data de coleta (mesmo não marcados como realizados)
    const procedimentosComColeta = procedimentos.filter(p =>
      !p.realizado &&
      p.ehAnatomoPatologicoObrigatorio &&
      p.dataColetaMaterialBiopsia &&
      !p.dataRegistroResultadoBiopsia
    )
    const consultaJaRealizadaSubmit =
      execucoesParaStatus.some(
        (e) => isConsultaMedicaEspecializada(e.procedimento.nome) && e.status === 'REALIZADO'
      ) || procedimentosRealizados.some((p) => p.ehConsultaEspecializada)
    const outrosRealizadosSemConsulta = procedimentosRealizados.some((p) => !p.ehConsultaEspecializada) && !consultaJaRealizadaSubmit
    if (outrosRealizadosSemConsulta) {
      setErro('O registro da consulta médica especializada deve ser realizado antes dos demais procedimentos. Registre primeiro a consulta médica (ou teleconsulta) em atenção especializada.')
      return
    }

    if (procedimentosRealizados.length === 0 && procedimentosComColeta.length === 0) {
      setErro('Selecione pelo menos um procedimento como realizado ou registre data de coleta para procedimentos anatomo-patológicos.')
      return
    }

    // Consultas/teleconsultas especializadas: exigir médico executante quando marcadas como REALIZADO
    const consultaSemMedicoExecutante = procedimentosRealizados.find(
      (p) => p.ehConsultaEspecializada && !p.medicoExecutante?.trim()
    )
    if (consultaSemMedicoExecutante) {
      setErro('Para consultas e teleconsultas médicas em atenção especializada, informe o médico executante.')
      return
    }

    // Validar que todos os procedimentos marcados como realizados têm data
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

    // ANATOMO-PATOLÓGICO marcado como realizado: exige data de coleta e data de resultado
    const anatomoRealizadoSemColetaOuResultado = procedimentosRealizados.find(
      (p) => p.ehAnatomoPatologicoObrigatorio && (!p.dataColetaMaterialBiopsia || !p.dataRegistroResultadoBiopsia)
    )
    if (anatomoRealizadoSemColetaOuResultado) {
      setErro('Para procedimentos anatomo-patológicos marcados como realizados, é necessário informar tanto a data de coleta quanto a data do resultado.')
      return
    }

    setSubmitting(true)
    try {
      // Promises para procedimentos marcados como realizados
      const promises = procedimentosRealizados.map(proc => {
        const dataFormatada = proc.dataExecucao.includes('T')
          ? proc.dataExecucao.split('T')[0]
          : proc.dataExecucao
        const [ano, mes, dia] = dataFormatada.split('-').map(Number)
        const dataLocal = new Date(ano, mes - 1, dia, 12, 0, 0)

        const payload: Record<string, unknown> = {
          status: 'REALIZADO',
          dataExecucao: dataLocal.toISOString()
        }
        if (proc.ehConsultaEspecializada && proc.medicoExecutante?.trim()) {
          payload.profissional = proc.medicoExecutante.trim()
          if (proc.medicoExecutanteId) {
            payload.executanteId = proc.medicoExecutanteId
          }
        }
        if (proc.unidadeExecutoraId) {
          payload.unidadeExecutoraId = proc.unidadeExecutoraId;
        }
        if (proc.ehAnatomoPatologicoObrigatorio && proc.dataColetaMaterialBiopsia && proc.dataRegistroResultadoBiopsia) {
          const [ac, mc, dc] = proc.dataColetaMaterialBiopsia.split('-').map(Number)
          const [ar, mr, dr] = proc.dataRegistroResultadoBiopsia.split('-').map(Number)
          payload.dataColetaMaterialBiopsia = new Date(ac, mc - 1, dc, 12, 0, 0).toISOString()
          payload.dataRegistroResultadoBiopsia = new Date(ar, mr - 1, dr, 12, 0, 0).toISOString()
        }
        return api.patch(`/solicitacoes/execucoes/${proc.execucaoId}`, payload)
      })

      // Promises para procedimentos com apenas data de coleta (AGUARDANDO_RESULTADO)
      const promisesColeta = procedimentosComColeta.map(proc => {
        const [ac, mc, dc] = proc.dataColetaMaterialBiopsia.split('-').map(Number)
        const payload: Record<string, unknown> = {
          dataColetaMaterialBiopsia: new Date(ac, mc - 1, dc, 12, 0, 0).toISOString()
        }
        // Não definir status explicitamente - deixar o backend determinar (AGUARDANDO_RESULTADO)
        return api.patch(`/solicitacoes/execucoes/${proc.execucaoId}`, payload)
      })

      // Também atualizar procedimentos que foram desmarcados (se estavam como REALIZADO)
      const procedimentosDesmarcados = procedimentos.filter(
        p => !p.realizado && execucoesParaStatus.find(e => e.id === p.execucaoId)?.status === 'REALIZADO'
      )

      const promisesDesmarcar = procedimentosDesmarcados.map(proc =>
        api.patch(`/solicitacoes/execucoes/${proc.execucaoId}`, {
          status: 'PENDENTE',
          dataExecucao: null
        })
      )

      await Promise.all([...promises, ...promisesColeta, ...promisesDesmarcar])

      let mensagem = ''
      if (procedimentosRealizados.length > 0 && procedimentosComColeta.length > 0) {
        mensagem = `${procedimentosRealizados.length} procedimento(s) realizado(s) e ${procedimentosComColeta.length} com coleta registrada!`
      } else if (procedimentosRealizados.length > 0) {
        mensagem = `${procedimentosRealizados.length} procedimento(s) registrado(s) como realizado(s)!`
      } else if (procedimentosComColeta.length > 0) {
        mensagem = `${procedimentosComColeta.length} procedimento(s) com coleta registrada - aguardando resultado!`
      }

      setSucesso(mensagem)
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[95vh] overflow-y-auto relative">
        {carregandoExecucoes && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Carregando procedimentos...</span>
            </div>
          </div>
        )}
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
                  className={`border rounded p-2 transition-colors ${proc.realizado
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
                          (!proc.ehConsultaEspecializada && !consultaJaRealizada) ||
                          (proc.ehAnatomoPatologicoObrigatorio && !proc.realizado && (!proc.dataColetaMaterialBiopsia || !proc.dataRegistroResultadoBiopsia))
                        }
                        title={
                          dispensado
                            ? 'Dispensado: outra consulta/teleconsulta já foi realizada'
                            : !podeRegistrarPorData(proc)
                              ? `O registro de realização do procedimento é permitido exclusivamente na data do agendamento (${proc.dataAgendamento ? proc.dataAgendamento.split('-').reverse().join('/') : ''}) ou em caráter retroativo.`
                              : !proc.ehConsultaEspecializada && !consultaJaRealizada
                                ? 'Consulta especializada ou teleconsulta é pré-requisito obrigatório'
                                : proc.ehAnatomoPatologicoObrigatorio && !proc.realizado && (!proc.dataColetaMaterialBiopsia || !proc.dataRegistroResultadoBiopsia)
                                  ? 'Informe a data de coleta de material e a data do resultado'
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

                      {/* ANATOMO-PATOLÓGICO obrigatório: exige data de coleta e data de resultado */}
                      {proc.ehAnatomoPatologicoObrigatorio && !proc.realizado && (
                        <div className="mt-1.5 ml-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label htmlFor={`coleta-${proc.execucaoId}`} className="block text-xs font-medium text-gray-700 mb-0.5">
                              Data de coleta de material <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                              <input
                                type="date"
                                id={`coleta-${proc.execucaoId}`}
                                value={proc.dataColetaMaterialBiopsia}
                                onChange={(e) => handleDataColetaChange(index, e.target.value)}
                                className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                disabled={submitting}
                                max={hoje}
                              />
                            </div>
                          </div>
                          <div>
                            <label htmlFor={`resultado-${proc.execucaoId}`} className="block text-xs font-medium text-gray-700 mb-0.5">
                              Data do resultado <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                              <input
                                type="date"
                                id={`resultado-${proc.execucaoId}`}
                                value={proc.dataRegistroResultadoBiopsia}
                                onChange={(e) => handleDataResultadoChange(index, e.target.value)}
                                className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                disabled={submitting}
                                min={proc.dataColetaMaterialBiopsia || undefined}
                                max={hoje}
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-amber-700 sm:col-span-2">
                            Procedimentos anatomo-patológicos obrigatórios exigem data de coleta e data do resultado para serem marcados como realizados.
                          </p>
                        </div>
                      )}

                      {/* Data de execução (visível apenas se marcado como realizado) */}
                      {proc.realizado && (
                        <div className="mt-1.5 ml-8 space-y-1.5">
                          {/* Unidade executante (seleção obrigatória para qualquer procedimento realizado se não houver unidade definida) */}
                          {!proc.unidadeExecutoraId && (
                            <div>
                              <label htmlFor={`unidade-${proc.execucaoId}`} className="block text-xs font-medium text-gray-700 mb-0.5">
                                Unidade executante <span className="text-red-500">*</span>
                              </label>
                              <SearchableSelect
                                options={Array.from(new Set(profissionais.flatMap(p => p.unidades || []).map(u => u.unidade?.id).filter(Boolean))).map(unidadeId => {
                                  const unidade = profissionais
                                    .flatMap(p => p.unidades || [])
                                    .find(u => u.unidade?.id === unidadeId);

                                  if (!unidade || !unidade.unidade) return null;

                                  const label = unidade.unidade.cnes
                                    ? `${unidade.unidade.cnes} - ${unidade.unidade.nome || unidade.unidade.id}`
                                    : (unidade.unidade.nome || unidade.unidade.id);

                                  return {
                                    value: unidadeId as string,
                                    label: label
                                  };
                                }).filter((u): u is { label: string, value: string } => u !== null)}
                                value={proc.unidadeExecutoraId}
                                onChange={(val) => {
                                  const novos = [...procedimentos];
                                  novos[index].unidadeExecutoraId = val;

                                  const unidade = profissionais
                                    .flatMap(p => p.unidades || [])
                                    .find(u => u.unidade?.id === val);

                                  if (unidade && unidade.unidade) {
                                    const nome = unidade.unidade.nome || unidade.unidade.id;
                                    const cnes = unidade.unidade.cnes;
                                    novos[index].unidadeExecutoraNome = cnes ? `${cnes} - ${nome}` : nome;
                                  } else {
                                    novos[index].unidadeExecutoraNome = '';
                                  }
                                  // Limpa o médico executante ao trocar a unidade
                                  novos[index].medicoExecutante = '';
                                  novos[index].medicoExecutanteId = ''; // Garantir limpeza do ID também se houver campo
                                  setProcedimentos(novos);
                                }}
                                placeholder="Selecione a unidade..."
                                emptyMessage="Nenhuma unidade encontrada"
                                disabled={submitting}
                              />
                            </div>
                          )}
                          {/* Unidade executante (vinda do agendamento ou já definida) */}
                          {proc.unidadeExecutoraNome && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                                Unidade executante
                              </label>
                              <p className="px-2 py-1 text-[11px] bg-gray-50 border border-gray-200 rounded text-gray-800">
                                {proc.unidadeExecutoraNome}
                              </p>
                            </div>
                          )}

                          <div>
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

                          {proc.ehConsultaEspecializada && (
                            <div>
                              <label
                                htmlFor={`medico-${proc.execucaoId}`}
                                className="block text-xs font-medium text-gray-700 mb-0.5"
                              >
                                Médico executante <span className="text-red-500">*</span>
                              </label>
                              {(() => {
                                const profissionaisDaUnidade = getProfissionaisDaUnidade(proc.unidadeExecutoraId)
                                if (profissionaisDaUnidade.length > 0) {
                                  return (
                                    <SearchableSelect
                                      options={profissionaisDaUnidade
                                        .map(p => ({
                                          value: p.id,
                                          label: p.nome + (p.cboRelacao?.codigo
                                            ? ` (${p.cboRelacao.codigo} - ${p.cboRelacao.descricao})`
                                            : (p.cbo ? ` (${p.cbo})` : ''))
                                        }))}
                                      value={proc.medicoExecutanteId} // Use medicoExecutanteId for the ID
                                      onChange={(val) => {
                                        const novos = [...procedimentos];
                                        novos[index].medicoExecutanteId = val;
                                        const prof = profissionaisDaUnidade.find((p) => p.id === val);
                                        novos[index].medicoExecutante = prof ? prof.nome : ''; // Store name for display/legacy
                                        setProcedimentos(novos);
                                      }}
                                      placeholder="Selecione o médico..."
                                      emptyMessage="Nenhum médico encontrado"
                                      disabled={submitting || carregandoProfissionais}
                                    />
                                  )
                                }

                                // Fallback: sem profissionais vinculados à unidade, permitir digitação livre
                                return (
                                  <input
                                    type="text"
                                    id={`medico-${proc.execucaoId}`}
                                    value={proc.medicoExecutante}
                                    onChange={(e) => handleMedicoExecutanteChange(index, e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={submitting}
                                    placeholder="Informe o médico que executou a consulta/teleconsulta"
                                  />
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status Visual e Ações */}
                    <div className="text-right flex items-center gap-2 flex-wrap justify-end">
                      {(() => {
                        const execucao = execucoesParaStatus.find((e) => e.id === proc.execucaoId)
                        const statusExibicao = execucao ? getStatusExibicao(execucao, execucoesParaStatus) : proc.status
                        if (statusExibicao === 'REALIZADO' || proc.realizado) {
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
                      {/* Modal de confirmação com justificativa */}
                      <ConfirmJustificativaModal
                        open={!!confirmJustificativa}
                        onCancel={() => setConfirmJustificativa(null)}
                        onConfirm={confirmarExclusao}
                        title={confirmJustificativa?.tipo === 'remover' ? 'Remover data de realização' : 'Confirmação'}
                        descricao="Informe a justificativa para esta ação."
                      />
                    </div>
                  </div>
                </div>
              )
            })}
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
