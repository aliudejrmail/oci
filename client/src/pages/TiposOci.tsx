import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Plus, Package, Edit, X, Save, Trash2, Search } from 'lucide-react'

interface TipoOci {
    id: string
    nome: string
    descricao?: string
    ativo: boolean
    _count?: {
        ocis: number
        solicitacoes: number
    }
}

export default function TiposOci() {
    const [tipos, setTipos] = useState<TipoOci[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    // Estados para Modal de Cadastro/Edição
    const [modalAberto, setModalAberto] = useState(false)
    const [tipoEdit, setTipoEdit] = useState<TipoOci | null>(null)
    const [form, setForm] = useState({
        nome: '',
        descricao: '',
        ativo: true
    })

    useEffect(() => {
        carregarTipos()
    }, [])

    const carregarTipos = async () => {
        setLoading(true)
        try {
            const res = await api.get('/tipos-oci')
            setTipos(res.data)
        } catch (e: any) {
            setErro('Erro ao carregar tipos de OCI: ' + (e.response?.data?.message || e.message))
        } finally {
            setLoading(false)
        }
    }

    const abrirModal = (tipo?: TipoOci) => {
        if (tipo) {
            setTipoEdit(tipo)
            setForm({
                nome: tipo.nome,
                descricao: tipo.descricao || '',
                ativo: tipo.ativo
            })
        } else {
            setTipoEdit(null)
            setForm({
                nome: '',
                descricao: '',
                ativo: true
            })
        }
        setErro(null)
        setModalAberto(true)
    }

    const salvar = async () => {
        if (!form.nome.trim()) {
            setErro('O nome é obrigatório.')
            return
        }
        setSalvando(true)
        setErro(null)
        try {
            if (tipoEdit) {
                await api.put(`/tipos-oci/${tipoEdit.id}`, form)
            } else {
                await api.post('/tipos-oci', form)
            }
            setModalAberto(false)
            carregarTipos()
        } catch (e: any) {
            setErro(e.response?.data?.message || e.message || 'Erro ao salvar.')
        } finally {
            setSalvando(false)
        }
    }

    const excluir = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este tipo? Isso não será possível se houver OCIs vinculadas.')) return
        try {
            await api.delete(`/tipos-oci/${id}`)
            carregarTipos()
        } catch (e: any) {
            alert(e.response?.data?.message || e.message || 'Erro ao excluir.')
        }
    }

    const tiposFiltrados = tipos.filter(t =>
        t.nome.toLowerCase().includes(search.toLowerCase()) ||
        t.descricao?.toLowerCase().includes(search.toLowerCase())
    )

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
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Tipos de OCI</h1>
                    <p className="text-gray-600 mt-1">Configuração de categorias (Geral, Oncológico, etc)</p>
                </div>
                <button
                    onClick={() => abrirModal()}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                    <Plus size={20} />
                    Novo Tipo
                </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou descrição..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                                <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tiposFiltrados.map((tipo) => (
                                <tr key={tipo.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary-50 rounded-lg text-primary-600 outline outline-1 outline-primary-100">
                                                <Package size={18} />
                                            </div>
                                            <span className="font-semibold text-gray-900">{tipo.nome}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-500">{tipo.descricao || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${tipo.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {tipo.ativo ? 'ATIVO' : 'INATIVO'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => abrirModal(tipo)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => excluir(tipo.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {tiposFiltrados.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        Nenhum tipo de OCI encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-slate-50">
                            <h2 className="text-lg font-bold text-gray-900">{tipoEdit ? 'Editar Tipo' : 'Novo Tipo'}</h2>
                            <button onClick={() => setModalAberto(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {erro && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg font-medium">
                                    {erro}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nome *</label>
                                <input
                                    type="text"
                                    value={form.nome}
                                    onChange={e => setForm({ ...form, nome: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                                    placeholder="Ex: ONCOLÓGICO"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Descrição</label>
                                <textarea
                                    value={form.descricao}
                                    onChange={e => setForm({ ...form, descricao: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none resize-none"
                                    placeholder="Descrição opcional..."
                                />
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <input
                                    type="checkbox"
                                    id="ativo"
                                    checked={form.ativo}
                                    onChange={e => setForm({ ...form, ativo: e.target.checked })}
                                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                                <label htmlFor="ativo" className="text-sm font-semibold text-gray-700 cursor-pointer select-none">Tipo Ativo</label>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setModalAberto(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-white transition-colors"
                                disabled={salvando}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={salvar}
                                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                disabled={salvando}
                            >
                                {salvando ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
