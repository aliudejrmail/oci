import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { BarChart3, FileText, Calendar, Filter, Download, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { formatarData, formatarDataHora } from '../utils/date-format'

interface OpcaoRelatorio {
  id: string
  label: string
  descricao: string
}

const STATUS_OPCOES = [
  { valor: '', label: 'Todos' },
  { valor: 'PENDENTE', label: 'Pendente' },
  { valor: 'EM_ANDAMENTO', label: 'Em andamento' },
  { valor: 'CONCLUIDA', label: 'Concluída' },
  { valor: 'VENCIDA', label: 'Vencida' },
  { valor: 'CANCELADA', label: 'Cancelada' }
]

const TIPO_OCI_OPCOES = [
  { valor: '', label: 'Todos' },
  { valor: 'GERAL', label: 'Geral' },
  { valor: 'ONCOLOGICO', label: 'Oncológico' }
]

export default function Relatorios() {
  const { usuario } = useAuth()
  const [opcoes, setOpcoes] = useState<OpcaoRelatorio[]>([])
  const [unidades, setUnidades] = useState<Array<{ id: string; nome: string; cnes: string }>>([])
  const [tipo, setTipo] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [status, setStatus] = useState('')
  const [unidadeId, setUnidadeId] = useState('')
  const [tipoOci, setTipoOci] = useState('')
  const [loading, setLoading] = useState(false)
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(true)
  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.get('/relatorios/opcoes')
      .then((res) => setOpcoes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOpcoes([]))
      .finally(() => setCarregandoOpcoes(false))
  }, [])

  useEffect(() => {
    api.get('/unidades?ativo=true')
      .then((res) => setUnidades(Array.isArray(res.data) ? res.data : []))
      .catch(() => setUnidades([]))
  }, [])

  const gerarRelatorio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tipo) {
      setErro('Selecione o tipo de relatório.')
      return
    }
    setErro(null)
    setResultado(null)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('tipo', tipo)
      if (dataInicio) params.append('dataInicio', dataInicio)
      if (dataFim) params.append('dataFim', dataFim)
      if (status) params.append('status', status)
      // Para relatórios de procedimentos executados, garantir envio correto do filtro de unidade executante
      if (unidadeId) {
        params.append('unidadeId', unidadeId)
      }
      if (tipoOci) params.append('tipoOci', tipoOci)
      const res = await api.get(`/relatorios?${params.toString()}`)
      setResultado(res.data as Record<string, unknown>)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao gerar relatório.'
      setErro(msg)
    } finally {
      setLoading(false)
    }
  }

  const tituloRelatorio = opcoes.find((o) => o.id === tipo)?.label ?? 'Relatório'

  const imprimir = () => {
    window.print()
  }

  const exportarCsv = (dados: unknown[], nomeArquivo: string) => {
    if (!dados.length) return
    const cabecalho = Object.keys(dados[0] as Record<string, unknown>).join(';')
    const linhas = (dados as Record<string, unknown>[]).map((row) =>
      Object.values(row).map((v) => (v != null && typeof v === 'object' && 'nome' in (v as object)
        ? (v as { nome?: string }).nome
        : String(v ?? ''))).join(';')
    )
    const csv = [cabecalho, ...linhas].join('\r\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${nomeArquivo}_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 print:hidden">
        <div className="p-2 bg-primary-50 rounded-lg">
          <BarChart3 className="text-primary-600" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500">Gere relatórios por período, status, unidade e tipo de OCI (Administrador e Gestor).</p>
        </div>
      </div>

      <form onSubmit={gerarRelatorio} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm print:hidden">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-600" />
          <h2 className="font-semibold text-gray-800">Filtros e tipo de relatório</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de relatório <span className="text-red-500">*</span></label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Selecione...</option>
              {opcoes.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            {opcoes.find((o) => o.id === tipo)?.descricao && (
              <p className="text-xs text-gray-500 mt-1">{opcoes.find((o) => o.id === tipo)?.descricao}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data início</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full pl-9 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data fim</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full pl-9 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
            >
              {STATUS_OPCOES.map((s) => (
                <option key={s.valor || 'todos'} value={s.valor}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidade (Solicitante ou Executante)</label>
            <select
              value={unidadeId}
              onChange={(e) => setUnidadeId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.nome} ({u.cnes})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo OCI</label>
            <select
              value={tipoOci}
              onChange={(e) => setTipoOci(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
            >
              {TIPO_OCI_OPCOES.map((t) => (
                <option key={t.valor || 'todos'} value={t.valor}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading || carregandoOpcoes}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Gerando...
              </>
            ) : (
              <>
                <FileText size={16} />
                Gerar relatório
              </>
            )}
          </button>
          {resultado && (
            <button
              type="button"
              onClick={imprimir}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium print:hidden"
            >
              <Printer size={16} />
              Imprimir
            </button>
          )}
        </div>
      </form>

      {erro && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 print:hidden">
          {erro}
        </div>
      )}

      {resultado && (
        <div id="relatorio-impressao" className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
            <h2 className="font-semibold text-gray-800">Resultado</h2>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={imprimir}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
              >
                <Printer size={16} />
                Imprimir
              </button>
              {tipo === 'por-periodo' && Array.isArray((resultado as { solicitacoes?: unknown[] }).solicitacoes) && (
                <button
                  type="button"
                  onClick={() => exportarCsv((resultado as { solicitacoes: unknown[] }).solicitacoes, 'solicitacoes')}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 text-sm font-medium transition-colors"
                >
                  <Download size={16} />
                  Exportar CSV
                </button>
              )}
              {tipo === 'procedimentos-executados' && Array.isArray((resultado as { execucoes?: unknown[] }).execucoes) && (
                <button
                  type="button"
                  onClick={() => exportarCsv((resultado as { execucoes: unknown[] }).execucoes, 'procedimentos-executados')}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 text-sm font-medium transition-colors"
                >
                  <Download size={16} />
                  Exportar CSV
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            <div className="hidden print:block mb-4 pb-2 border-b border-gray-200">
              <h1 className="text-lg font-bold text-gray-900">Relatório - {tituloRelatorio}</h1>
              <p className="text-xs text-gray-500 mt-1">
                Gerado em {formatarDataHora(new Date())}
                {(usuario?.unidade?.nome || usuario?.unidadeExecutante?.nome)
                  ? ` | ${usuario.unidade?.nome || usuario.unidadeExecutante?.nome}`
                  : ''}
                {' | Sec. Municipal de Saúde - Parauapebas'}
              </p>
            </div>
            <ResultadoRelatorio tipo={tipo} resultado={resultado} />
          </div>
        </div>
      )}
    </div>
  )
}

function ResultadoRelatorio({ tipo, resultado }: { tipo: string; resultado: Record<string, unknown> }) {
  if (tipo === 'resumo') {
    const total = resultado.total as number
    const porStatus = (resultado.porStatus as Array<{ status: string; quantidade: number }>) ?? []
    const porTipo = (resultado.porTipo as Array<{ tipo: string; quantidade: number }>) ?? []
    return (
      <div className="space-y-4">
        <div className="text-2xl font-bold text-primary-600">{total} solicitações</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Por status</h3>
            <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {porStatus.map((s) => (
                  <tr key={s.status} className="border-t border-gray-100">
                    <td className="px-3 py-2">{s.status}</td>
                    <td className="px-3 py-2 text-right font-medium">{s.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Por tipo OCI</h3>
            <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Tipo</th>
                  <th className="text-right px-3 py-2">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {porTipo.map((t) => (
                  <tr key={t.tipo} className="border-t border-gray-100">
                    <td className="px-3 py-2">{t.tipo}</td>
                    <td className="px-3 py-2 text-right font-medium">{t.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (tipo === 'por-periodo') {
    const solicitacoes = (resultado.solicitacoes as Array<Record<string, unknown>>) ?? []
    const total = (resultado.total as number) ?? 0
    const limite = (resultado.limite as number) ?? 0
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Total: {total} {limite < total && `(exibindo até ${limite})`}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Protocolo</th>
                <th className="text-left px-3 py-2">Paciente</th>
                <th className="text-left px-3 py-2">OCI</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Data solicitação</th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map((s: Record<string, unknown>) => (
                <tr key={String(s.id)} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">{String(s.numeroProtocolo ?? '')}</td>
                  <td className="px-3 py-2">{String((s.paciente as { nome?: string })?.nome ?? '')}</td>
                  <td className="px-3 py-2">{String((s.oci as { nome?: string })?.nome ?? '')}</td>
                  <td className="px-3 py-2">{String(s.status ?? '')}</td>
                  <td className="px-3 py-2">{s.dataSolicitacao ? formatarData(s.dataSolicitacao as string) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (tipo === 'por-status' || tipo === 'por-tipo-oci') {
    const dados = Array.isArray(resultado)
      ? (resultado as Array<{ status?: string; tipo?: string; quantidade: number }>)
      : ((resultado as Record<string, unknown[]>)[tipo === 'por-status' ? 'porStatus' : 'porTipo'] as Array<{ status?: string; tipo?: string; quantidade: number }>) ?? []
    const chave = tipo === 'por-status' ? 'status' : 'tipo'
    return (
      <table className="w-full text-sm border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2">{tipo === 'por-status' ? 'Status' : 'Tipo OCI'}</th>
            <th className="text-right px-3 py-2">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          {(dados as Array<Record<string, unknown>>).map((row, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="px-3 py-2">{String(row[chave] ?? '')}</td>
              <td className="px-3 py-2 text-right font-medium">{Number(row.quantidade)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (tipo === 'por-oci') {
    const lista = (resultado as unknown as Array<{ ociNome: string; quantidade: number }>) ?? []
    return (
      <table className="w-full text-sm border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2">Oferta de Cuidado (OCI)</th>
            <th className="text-right px-3 py-2">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((row, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="px-3 py-2">{row.ociNome ?? '-'}</td>
              <td className="px-3 py-2 text-right font-medium">{row.quantidade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (tipo === 'por-unidade-origem' || tipo === 'por-unidade-destino') {
    const lista = Array.isArray(resultado)
      ? (resultado as Array<{ unidadeNome: string; quantidade: number }>)
      : ((resultado as Record<string, unknown[]>)[tipo === 'por-unidade-origem' ? 'porUnidadeOrigem' : 'porUnidadeDestino'] as Array<{ unidadeNome: string; quantidade: number }>) ?? []
    return (
      <table className="w-full text-sm border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2">Unidade</th>
            <th className="text-right px-3 py-2">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((row, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="px-3 py-2">{row.unidadeNome ?? '-'}</td>
              <td className="px-3 py-2 text-right font-medium">{row.quantidade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (tipo === 'procedimentos-executados') {
    const execucoes = (resultado.execucoes as Array<Record<string, unknown>>) ?? []
    const total = (resultado.total as number) ?? 0
    const limite = (resultado.limite as number) ?? 0
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Total: {total} procedimentos executados {limite < total && `(exibindo até ${limite})`}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Protocolo</th>
                <th className="text-left px-3 py-2">Paciente</th>
                <th className="text-left px-3 py-2">Procedimento</th>
                <th className="text-left px-3 py-2">Unidade Executante</th>
                <th className="text-left px-3 py-2">Data execução</th>
              </tr>
            </thead>
            <tbody>
              {execucoes.map((e: Record<string, unknown>) => (
                <tr key={String(e.id)} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">{String((e.solicitacao as { numeroProtocolo?: string })?.numeroProtocolo ?? '')}</td>
                  <td className="px-3 py-2">{String((e.solicitacao as { paciente?: { nome?: string } })?.paciente?.nome ?? '')}</td>
                  <td className="px-3 py-2">{String((e.procedimento as { nome?: string })?.nome ?? '')}</td>
                  <td className="px-3 py-2">{String((e.unidadeExecutante as { nome?: string })?.nome ?? '')}</td>
                  <td className="px-3 py-2">{e.dataExecucao ? formatarData(e.dataExecucao as string) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (tipo === 'tempo-medio-conclusao') {
    const qtd = (resultado.quantidade as number) ?? 0
    const media = resultado.mediaDias as number | null
    const min = resultado.minDias as number | null
    const max = resultado.maxDias as number | null
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 uppercase">Solicitações concluídas</p>
          <p className="text-xl font-bold text-gray-900">{qtd}</p>
        </div>
        <div className="p-4 bg-primary-50 rounded-lg">
          <p className="text-xs text-primary-600 uppercase">Tempo médio (dias)</p>
          <p className="text-xl font-bold text-primary-700">{media != null ? media : '-'}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 uppercase">Mínimo (dias)</p>
          <p className="text-xl font-bold text-gray-900">{min != null ? min : '-'}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 uppercase">Máximo (dias)</p>
          <p className="text-xl font-bold text-gray-900">{max != null ? max : '-'}</p>
        </div>
      </div>
    )
  }

  if (tipo === 'evolucao-mensal') {
    const lista = Array.isArray(resultado)
      ? (resultado as Array<{ mes: string; criadas: number; concluidas: number }>)
      : ((resultado as Record<string, unknown[]>).evolucaoMensal as Array<{ mes: string; criadas: number; concluidas: number }>) ?? []
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Mês (AAAA-MM)</th>
              <th className="text-right px-3 py-2">Criadas</th>
              <th className="text-right px-3 py-2">Concluídas</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((row, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-3 py-2">{(() => {
                  const [ano, mes] = row.mes.split('-');
                  return mes && ano ? `${mes}/${ano}` : row.mes;
                })()}</td>
                <td className="px-3 py-2 text-right font-medium">{row.criadas ?? 0}</td>
                <td className="px-3 py-2 text-right font-medium">{row.concluidas ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return <pre className="text-xs overflow-auto p-2 bg-gray-50 rounded">{JSON.stringify(resultado, null, 2)}</pre>
}
