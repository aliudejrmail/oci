import { useState, useEffect } from 'react'
import axios from 'axios'
import {
    Search,
    Filter,
    Calendar,
    User,
    Activity,
    ChevronLeft,
    ChevronRight,
    Eye,
    Info
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

interface Log {
    id: string
    usuarioId: string | null
    acao: string
    entidade: string
    entidadeId: string | null
    detalhes: string | null
    ip: string | null
    userAgent: string | null
    createdAt: string
    usuario: {
        nome: string
        email: string
    } | null
}

export default function Auditoria() {
    const [logs, setLogs] = useState<Log[]>([])
    const [loading, setLoading] = useState(true)
    const [acoes, setAcoes] = useState<string[]>([])
    const [entidades, setEntidades] = useState<string[]>([])

    // Filtros
    const [filtroAcao, setFiltroAcao] = useState('')
    const [filtroEntidade, setFiltroEntidade] = useState('')
    const [dataInicio, setDataInicio] = useState('')
    const [dataFim, setDataFim] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [detalheLog, setDetalheLog] = useState<Log | null>(null)

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const { data } = await axios.get(`${API_URL}/auditoria`, {
                params: {
                    acao: filtroAcao || undefined,
                    entidade: filtroEntidade || undefined,
                    dataInicio: dataInicio || undefined,
                    dataFim: dataFim || undefined,
                    page,
                    limit: 20
                },
                withCredentials: true
            })
            setLogs(data.logs)
            setTotalPages(data.paginacao.totalPages)
            setTotal(data.paginacao.total)
        } catch (error) {
            console.error('Erro ao buscar logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchFiltros = async () => {
        try {
            const [resAcoes, resEntidades] = await Promise.all([
                axios.get(`${API_URL}/auditoria/acoes`, { withCredentials: true }),
                axios.get(`${API_URL}/auditoria/entidades`, { withCredentials: true })
            ])
            setAcoes(resAcoes.data)
            setEntidades(resEntidades.data)
        } catch (error) {
            console.error('Erro ao buscar filtros:', error)
        }
    }

    useEffect(() => {
        fetchFiltros()
    }, [])

    useEffect(() => {
        fetchLogs()
    }, [page, filtroAcao, filtroEntidade, dataInicio, dataFim])

    const formatarDetalhes = (detalhes: string | null) => {
        if (!detalhes) return 'Nenhum detalhe disponível'
        try {
            const obj = JSON.parse(detalhes)
            return <pre className="text-xs bg-slate-900 text-blue-300 p-4 rounded-lg overflow-auto max-h-64">{JSON.stringify(obj, null, 2)}</pre>
        } catch {
            return <p className="text-sm text-slate-600">{detalhes}</p>
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Histórico e Auditoria</h1>
                    <p className="text-slate-500">Acompanhe todas as ações realizadas no sistema.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-semibold border border-primary-100">
                    <Activity size={16} />
                    <span>{total} registros encontrados</span>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ação</label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={filtroAcao}
                                onChange={(e) => { setFiltroAcao(e.target.value); setPage(1); }}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                            >
                                <option value="">Todas as ações</option>
                                {acoes.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Entidade</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={filtroEntidade}
                                onChange={(e) => { setFiltroEntidade(e.target.value); setPage(1); }}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                            >
                                <option value="">Todas as entidades</option>
                                {entidades.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Início</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="date"
                                value={dataInicio}
                                onChange={(e) => { setDataInicio(e.target.value); setPage(1); }}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fim</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="date"
                                value={dataFim}
                                onChange={(e) => { setDataFim(e.target.value); setPage(1); }}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabela de Logs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data/Hora</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Usuário</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ação</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Entidade</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">IP</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Carregando logs...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        Nenhum registro encontrado com estes filtros.
                                    </td>
                                </tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-slate-700">
                                            {format(new Date(log.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                                        </div>
                                        <div className="text-xs text-slate-400 uppercase font-bold">
                                            {format(new Date(log.createdAt), 'HH:mm:ss')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 text-xs shrink-0">
                                                {log.usuario?.nome?.charAt(0) || <User size={12} />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-slate-700 truncate">{log.usuario?.nome || 'Sistema'}</div>
                                                <div className="text-[11px] text-slate-400 truncate">{log.usuario?.email || '-'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${log.acao.includes('FAIL') ? 'bg-red-50 text-red-600 border border-red-100' :
                                                log.acao.includes('CRIACAO') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                    log.acao.includes('EXCLUSAO') ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                                        'bg-blue-50 text-blue-600 border border-blue-100'
                                            }`}>
                                            {log.acao}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                        {log.entidade}
                                        {log.entidadeId && (
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[120px]">
                                                ID: {log.entidadeId}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                                        {log.ip || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setDetalheLog(log)}
                                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                            title="Ver detalhes"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-sm text-slate-500 font-medium">
                        Página <span className="text-slate-900 font-bold">{page}</span> de <span className="text-slate-900 font-bold">{totalPages}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="p-2 text-slate-500 hover:bg-white hover:text-primary-600 rounded-lg border border-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                            className="p-2 text-slate-500 hover:bg-white hover:text-primary-600 rounded-lg border border-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Detalhes */}
            {detalheLog && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                                    <Info size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Detalhes do Evento</h3>
                                    <p className="text-sm text-slate-500">ID: {detalheLog.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDetalheLog(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ação Realizada</p>
                                    <p className="text-sm font-bold text-slate-700">{detalheLog.acao}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entidade Afetada</p>
                                    <p className="text-sm font-bold text-slate-700">{detalheLog.entidade} ({detalheLog.entidadeId || '-'})</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dados Adicionais (Payload)</p>
                                {formatarDetalhes(detalheLog.detalhes)}
                            </div>

                            {detalheLog.userAgent && (
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Browser / Dispositivo</p>
                                    <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                                        {detalheLog.userAgent}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setDetalheLog(null)}
                                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all text-sm"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
