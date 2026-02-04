import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { X, Pencil } from 'lucide-react'

interface Paciente {
  id: string
  nome: string
  cpf: string
  cns?: string | null
  dataNascimento: string
  sexo: string
  responsavel?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  bairro?: string | null
  municipio: string
  uf: string
  telefone?: string | null
  email?: string | null
}

interface EditarPacienteModalProps {
  open: boolean
  pacienteId: string | null
  onClose: () => void
  onSuccess?: () => void
}

const formInicial = {
  cpf: '',
  cns: '',
  nome: '',
  dataNascimento: '',
  sexo: '',
  responsavel: '',
  cep: '',
  logradouro: '',
  numero: '',
  bairro: '',
  municipio: '',
  uf: '',
  telefone: '',
  email: ''
}

function formatarCpf(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 3) return n
  if (n.length <= 6) return n.replace(/(\d{3})(\d+)/, '$1.$2')
  if (n.length <= 9) return n.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3')
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4')
}

function formatarCep(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 8)
  return n.replace(/(\d{5})(\d)/, '$1-$2')
}

function formatarTelefone(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2) return n ? `(${n}` : ''
  if (n.length <= 6) return n.replace(/(\d{2})(\d+)/, '($1) $2')
  if (n.length <= 10) return n.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3')
  return n.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3')
}

function pacienteParaForm(p: Paciente) {
  const dataIso = p.dataNascimento?.toString().slice(0, 10) || ''
  return {
    cpf: formatarCpf(p.cpf || ''),
    cns: p.cns || '',
    nome: p.nome || '',
    dataNascimento: dataIso,
    sexo: p.sexo || '',
    responsavel: p.responsavel || '',
    cep: p.cep ? formatarCep(p.cep) : '',
    logradouro: p.logradouro || '',
    numero: p.numero || '',
    bairro: p.bairro || '',
    municipio: p.municipio || '',
    uf: p.uf || '',
    telefone: p.telefone ? formatarTelefone(p.telefone) : '',
    email: p.email || ''
  }
}

export default function EditarPacienteModal({ open, pacienteId, onClose, onSuccess }: EditarPacienteModalProps) {
  const [form, setForm] = useState(formInicial)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [buscandoCep, setBuscandoCep] = useState(false)

  useEffect(() => {
    if (open && pacienteId) {
      setLoading(true)
      setErro(null)
      api
        .get(`/pacientes/${pacienteId}`)
        .then((res) => {
          const p = res.data as Paciente
          setForm(pacienteParaForm(p))
        })
        .catch((err) => {
          setErro(err.response?.data?.message || 'Erro ao carregar paciente.')
        })
        .finally(() => setLoading(false))
    } else if (!open) {
      setForm(formInicial)
      setErro(null)
    }
  }, [open, pacienteId])

  const handleChange = (campo: string, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErro(null)
  }

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, '')
    if (cep.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          logradouro: data.logradouro || f.logradouro,
          bairro: data.bairro || f.bairro,
          municipio: data.localidade || f.municipio,
          uf: data.uf || f.uf
        }))
      }
    } catch {
      // ignorar
    } finally {
      setBuscandoCep(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pacienteId) return
    if (!form.nome?.trim() || !form.cpf?.trim() || !form.dataNascimento || !form.sexo || !form.municipio?.trim() || !form.uf?.trim()) {
      setErro('Preencha os campos obrigatórios: nome, CPF, data nascimento, sexo, município e UF.')
      return
    }
    setSubmitting(true)
    setErro(null)
    try {
      await api.put(`/pacientes/${pacienteId}`, {
        nome: form.nome.trim(),
        cpf: form.cpf.replace(/\D/g, ''),
        cns: form.cns?.replace(/\D/g, '') || null,
        dataNascimento: form.dataNascimento,
        sexo: form.sexo.trim(),
        responsavel: form.responsavel?.trim() || null,
        cep: form.cep?.replace(/\D/g, '') || null,
        logradouro: form.logradouro?.trim() || null,
        numero: form.numero?.trim() || null,
        bairro: form.bairro?.trim() || null,
        municipio: form.municipio.trim(),
        uf: form.uf.trim().toUpperCase().slice(0, 2),
        telefone: form.telefone?.replace(/\D/g, '') || null,
        email: form.email?.trim() || null
      })
      onSuccess?.()
      onClose()
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Erro ao atualizar paciente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Pencil size={18} className="text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900">Editar Paciente</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-gray-500 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-3 space-y-2">
            {erro && (
              <div className="p-2 rounded bg-red-50 text-red-700 text-xs">{erro}</div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">CPF *</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => handleChange('cpf', formatarCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">CNS</label>
                <input
                  type="text"
                  value={form.cns}
                  onChange={(e) => handleChange('cns', e.target.value.replace(/\D/g, '').slice(0, 15))}
                  placeholder="15 dígitos"
                  maxLength={15}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Nome *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Nome completo"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de Nascimento *</label>
                <input
                  type="date"
                  value={form.dataNascimento}
                  onChange={(e) => handleChange('dataNascimento', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Sexo *</label>
                <select
                  value={form.sexo}
                  onChange={(e) => handleChange('sexo', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                  required
                >
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="I">Ignorado</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Responsável (menor ou necessidade)</label>
              <input
                type="text"
                value={form.responsavel}
                onChange={(e) => handleChange('responsavel', e.target.value)}
                placeholder="Nome do responsável quando aplicável"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="border-t pt-2 mt-2">
              <h3 className="text-xs font-semibold text-gray-700 mb-1.5">Endereço</h3>
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">CEP</label>
                  <input
                    type="text"
                    value={form.cep}
                    onChange={(e) => handleChange('cep', formatarCep(e.target.value))}
                    onBlur={buscarCep}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                {buscandoCep && (
                  <span className="text-[10px] text-gray-500 self-end pb-1">Buscando...</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Rua</label>
                  <input
                    type="text"
                    value={form.logradouro}
                    onChange={(e) => handleChange('logradouro', e.target.value)}
                    placeholder="Logradouro"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Nº</label>
                  <input
                    type="text"
                    value={form.numero}
                    onChange={(e) => handleChange('numero', e.target.value)}
                    placeholder="Número"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Bairro</label>
                  <input
                    type="text"
                    value={form.bairro}
                    onChange={(e) => handleChange('bairro', e.target.value)}
                    placeholder="Bairro"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Cidade *</label>
                  <input
                    type="text"
                    value={form.municipio}
                    onChange={(e) => handleChange('municipio', e.target.value)}
                    placeholder="Município"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-700 mb-0.5">UF *</label>
                <input
                  type="text"
                  value={form.uf}
                  onChange={(e) => handleChange('uf', e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="UF"
                  maxLength={2}
                  className="w-16 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 uppercase"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => handleChange('telefone', formatarTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Salvando…' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
