import { useState, useEffect } from 'react'
import { X, Calendar } from 'lucide-react'
import { api } from '../services/api'
import { formatarDataHoraCompacto } from '../utils/date-format'

interface UnidadeOption {
  id: string
  cnes: string
  nome: string
}


interface ExecucaoItem {
  id: string
  status: string
  dataAgendamento?: string | null
  unidadeExecutora?: string | null
  procedimento: {
    id: string
    nome: string
    codigo: string
    tipo: string
  }
}

interface AgendarModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  solicitacaoId?: string
  execucoes: ExecucaoItem[]
  /** Quando true, exibe título/descrição de reagendamento (para perfil Executante) */
  tituloReagendamento?: boolean
  /** Unidade já definida (reagendamento pelo usuário da unidade) — exibe só o nome da unidade (sem dropdown) */
  unidadeExecutoraPreenchida?: string
}

export default function AgendarModal({
  open,
  onClose,
  onSuccess,
  execucoes,
  tituloReagendamento = false,
  unidadeExecutoraPreenchida = ''
}: AgendarModalProps) {
  const [unidades, setUnidades] = useState<UnidadeOption[]>([])
  const [loadingUnidades, setLoadingUnidades] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dataAgendamento, setDataAgendamento] = useState('')
  const [horaAgendamento, setHoraAgendamento] = useState('08:00')
  const [unidadeExecutora, setUnidadeExecutora] = useState('')
  const [unidadeExecutoraId, setUnidadeExecutoraId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  // Apenas execuções que podem ser agendadas (PENDENTE ou AGENDADO; não REALIZADO)
  const execucoesAgendaveis = execucoes.filter((e) => e.status !== 'REALIZADO')

  const reagendamentoUnidadeFixa = Boolean(tituloReagendamento && unidadeExecutoraPreenchida)

  useEffect(() => {
    if (!open) return
    setErro(null)
    setSucesso(null)
    setSelectedIds(new Set())
    const hoje = new Date().toISOString().split('T')[0]
    setDataAgendamento(hoje)
    setHoraAgendamento('08:00')
    if (reagendamentoUnidadeFixa) {
      setUnidadeExecutora(unidadeExecutoraPreenchida)
      setUnidadeExecutoraId('')
    } else {
      setUnidadeExecutora('')
      setUnidadeExecutoraId('')
    }

    const carregar = async () => {
      if (reagendamentoUnidadeFixa) {
        setLoadingUnidades(false)
        return
      }
      setLoadingUnidades(true)
      try {
        const resUnidades = await api.get('/unidades-executantes?ativo=true')
        const listaUnidades = resUnidades.data ?? []
        setUnidades(listaUnidades)
        if (listaUnidades.length > 0) setUnidadeExecutora(`${listaUnidades[0].cnes} - ${listaUnidades[0].nome}`)
      } catch {
        setErro('Não foi possível carregar as unidades executantes.')
      } finally {
        setLoadingUnidades(false)
      }
    }
    carregar()
  }, [open, reagendamentoUnidadeFixa, unidadeExecutoraPreenchida])

  const toggleSelecao = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selecionarTodos = () => {
    if (selectedIds.size === execucoesAgendaveis.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(execucoesAgendaveis.map((e) => e.id)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setSucesso(null)

    if (selectedIds.size === 0) {
      setErro('Selecione ao menos uma consulta ou procedimento.')
      return
    }
    if (!dataAgendamento.trim()) {
      setErro('Informe a data do agendamento.')
      return
    }
    const unidadeParaEnvio = reagendamentoUnidadeFixa ? unidadeExecutoraPreenchida : unidadeExecutora
    const unidadeIdParaEnvio = reagendamentoUnidadeFixa ? '' : unidadeExecutoraId
    if (!unidadeParaEnvio.trim()) {
      setErro('Selecione a unidade executante.')
      return
    }
    const dataTimeISO = `${dataAgendamento}T${horaAgendamento}:00`
    setSubmitting(true)
    try {
      let sucessoCount = 0
      for (const id of selectedIds) {
        await api.patch(`/solicitacoes/execucoes/${id}`, {
          dataAgendamento: dataTimeISO,
          unidadeExecutora: unidadeParaEnvio.trim(),
          unidadeExecutoraId: unidadeIdParaEnvio || undefined,
          executanteId: null,
          status: 'AGENDADO'
        })
        sucessoCount++
      }
      setSucesso(`${sucessoCount} item(ns) agendado(s) com sucesso.`)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1200)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao agendar.'
      setErro(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="text-primary-600" size={18} />
            <h2 className="text-base font-bold text-gray-900">
              {tituloReagendamento ? 'Reagendar procedimentos' : 'Agendar consultas e procedimentos'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-gray-500 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
          {erro && (
            <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="p-2 rounded bg-green-50 border border-green-200 text-green-700 text-xs">
              {sucesso}
            </div>
          )}

          <p className="text-xs text-gray-600">
            {tituloReagendamento
              ? 'Selecione os procedimentos que precisam ser reagendados (não foi possível realizar na data anterior), informe nova data/hora e unidade executante.'
              : 'Selecione as consultas e procedimentos da OCI, informe data/hora e a unidade executante.'}
          </p>

          {/* Lista de consultas e procedimentos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-700">
                Consultas e procedimentos
              </label>
              {execucoesAgendaveis.length > 0 && (
                <button
                  type="button"
                  onClick={selecionarTodos}
                  className="text-[10px] text-primary-600 hover:underline"
                >
                  {selectedIds.size === execucoesAgendaveis.length ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              )}
            </div>
            {execucoesAgendaveis.length === 0 ? (
              <p className="text-xs text-gray-500 py-1.5">
                Não há itens pendentes para agendar (todos já foram realizados).
              </p>
            ) : (
              <ul className="border border-gray-200 rounded divide-y divide-gray-100 max-h-40 overflow-y-auto">
                {execucoesAgendaveis.map((exec) => (
                  <li key={exec.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`ag-${exec.id}`}
                      checked={selectedIds.has(exec.id)}
                      onChange={() => toggleSelecao(exec.id)}
                      className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor={`ag-${exec.id}`} className="flex-1 min-w-0 cursor-pointer">
                      <span className="font-medium text-xs text-gray-900 block truncate" title={exec.procedimento.nome}>
                        {exec.procedimento.nome}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {exec.procedimento.tipo} - {exec.procedimento.codigo}
                        {exec.status === 'AGENDADO' && exec.dataAgendamento && (
                          <> • Já agendado: {formatarDataHoraCompacto(exec.dataAgendamento)}</>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Data e hora */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="dataAgendamento" className="block text-xs font-medium text-gray-700 mb-0.5">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                id="dataAgendamento"
                type="date"
                value={dataAgendamento}
                onChange={(e) => setDataAgendamento(e.target.value)}
                required
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label htmlFor="horaAgendamento" className="block text-xs font-medium text-gray-700 mb-0.5">
                Hora <span className="text-red-500">*</span>
              </label>
              <input
                id="horaAgendamento"
                type="time"
                value={horaAgendamento}
                onChange={(e) => setHoraAgendamento(e.target.value)}
                required
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Unidade executante: no reagendamento pela unidade, exibe só o nome (pré-preenchido); senão, dropdown */}
          {reagendamentoUnidadeFixa ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Unidade Executante</label>
              <p className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-800">
                {unidadeExecutoraPreenchida}
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="unidadeExecutora" className="block text-xs font-medium text-gray-700 mb-0.5">
                Unidade Executante <span className="text-red-500">*</span>
              </label>
              <select
                id="unidadeExecutora"
                value={unidadeExecutora}
                onChange={(e) => setUnidadeExecutora(e.target.value)}
                required
                disabled={loadingUnidades}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60"
              >
                <option value="">Selecione a unidade</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.cnes} - {u.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || selectedIds.size === 0 || loadingUnidades}
              className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Calendar size={14} />
              {submitting
                ? (tituloReagendamento ? 'Reagendando...' : 'Agendando...')
                : (tituloReagendamento ? 'Reagendar' : 'Agendar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
