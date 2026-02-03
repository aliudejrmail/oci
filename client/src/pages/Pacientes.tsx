import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Search, Plus } from 'lucide-react'
import NovoPacienteModal from '../components/NovoPacienteModal'

interface Paciente {
  id: string
  nome: string
  cpf: string
  dataNascimento: string
  sexo: string
  telefone?: string
  email?: string
  municipio: string
  uf: string
}

export default function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalNovoPacienteAberto, setModalNovoPacienteAberto] = useState(false)
  const [erroApi, setErroApi] = useState<string | null>(null)

  useEffect(() => {
    carregarPacientes()
  }, [search])

  const carregarPacientes = async () => {
    setErroApi(null)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)

      const response = await api.get(`/pacientes?${params.toString()}`)
      setPacientes(response.data.pacientes || [])
    } catch (error: any) {
      console.error('Erro ao carregar pacientes:', error)
      setPacientes([])
      const msg = error?.response?.data?.message || error?.message || 'Servidor indisponível.'
      setErroApi(`Não foi possível carregar os dados. ${msg} Verifique se o backend está rodando (na pasta do projeto: npm run dev ou npm run dev:server).`)
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
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Pacientes</h1>
          <p className="text-gray-600 mt-1">Gestão de pacientes do sistema</p>
        </div>
        <button
          onClick={() => setModalNovoPacienteAberto(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Paciente
        </button>
      </div>

      {erroApi && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          {erroApi}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Nascimento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sexo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Município/UF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pacientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhum paciente encontrado
                  </td>
                </tr>
              ) : (
                pacientes.map((paciente) => (
                  <tr key={paciente.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {paciente.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {paciente.cpf}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(paciente.dataNascimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {paciente.sexo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {paciente.municipio}/{paciente.uf}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {paciente.telefone || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NovoPacienteModal
        open={modalNovoPacienteAberto}
        onClose={() => setModalNovoPacienteAberto(false)}
        onSuccess={() => {
          setModalNovoPacienteAberto(false)
          carregarPacientes()
        }}
      />
    </div>
  )
}
