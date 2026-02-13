import { useRef, useEffect, useState, useCallback } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { X, FileText, Trash2, CheckCircle, UserPlus, Search } from 'lucide-react'
import NovoPacienteModal from './NovoPacienteModal'

interface PacienteOption {
  id: string
  nome: string
  cpf: string
  cns?: string
}

interface OciOption {
  id: string
  codigo: string
  nome: string
  tipoId: string
  tipo?: { nome: string }
}

interface UnidadeOption {
  id: string
  cnes: string
  nome: string
  ativo: boolean
  executante?: number
}

interface ProfissionalOption {
  id: string
  nome: string
  cns: string
  cbo?: string
  cboRelacao?: {
    id: string
    codigo: string
    descricao: string
  } | null
  unidades?: {
    unidade?: {
      id: string
      nome: string
      cnes: string
    } | null
  }[]
}

interface NovaSolicitacaoModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const formInicial = {
  pacienteId: '',
  pacienteBusca: '',
  ociId: '',
  ociBusca: '',
  unidadeOrigem: '',
  unidadeOrigemId: '',
  unidadeDestino: '',
  unidadeDestinoId: '',
  medicoSolicitanteId: '',
  observacoes: ''
}

const MAX_ANEXOS_MB = 10
const MAX_ANEXOS = 10

export default function NovaSolicitacaoModal({ open, onClose, onSuccess }: NovaSolicitacaoModalProps) {
  const { usuario } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pacienteInputRef = useRef<HTMLDivElement>(null)
  const ociInputRef = useRef<HTMLDivElement>(null)
  const [pacientesBusca, setPacientesBusca] = useState<PacienteOption[]>([])
  const [ocis, setOcis] = useState<OciOption[]>([])
  const [unidades, setUnidades] = useState<UnidadeOption[]>([])
  const [profissionais, setProfissionais] = useState<ProfissionalOption[]>([])
  const [loadingDados, setLoadingDados] = useState(false)
  const [loadingPacientes, setLoadingPacientes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [form, setForm] = useState(formInicial)
  const [arquivosPdf, setArquivosPdf] = useState<File[]>([])
  const [showPacienteDropdown, setShowPacienteDropdown] = useState(false)
  const [showOciDropdown, setShowOciDropdown] = useState(false)
  const [modalNovoPacienteAberto, setModalNovoPacienteAberto] = useState(false)

  const buscarPacientes = useCallback(async (termo: string) => {
    if (!termo || termo.trim().length < 2) {
      setPacientesBusca([])
      return
    }
    setLoadingPacientes(true)
    try {
      const res = await api.get(`/pacientes?search=${encodeURIComponent(termo.trim())}&limit=20`)
      setPacientesBusca(res.data.pacientes ?? [])
      setShowPacienteDropdown(true)
    } catch {
      setPacientesBusca([])
    } finally {
      setLoadingPacientes(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open && form.pacienteBusca) {
        buscarPacientes(form.pacienteBusca)
      } else {
        setPacientesBusca([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [form.pacienteBusca, open, buscarPacientes])

  const valorUnidadeSolicitante = usuario?.unidade
    ? `${usuario.unidade.cnes} - ${usuario.unidade.nome}`
    : ''
  const unidadeSolicitanteId = usuario?.unidade?.id ?? ''

  useEffect(() => {
    if (!open) return
    const estadoInicial = {
      ...formInicial,
      unidadeOrigem: valorUnidadeSolicitante,
      unidadeOrigemId: unidadeSolicitanteId
    }
    setForm(estadoInicial)
    setArquivosPdf([])
    setErro(null)
    setSucesso(null)
    setPacientesBusca([])
    setShowPacienteDropdown(false)
    setModalNovoPacienteAberto(false)
    const carregar = async () => {
      setLoadingDados(true)
      try {
        const [resOcis, resUnidades] = await Promise.all([
          api.get('/ocis?ativo=true'),
          api.get('/unidades?ativo=true')
        ])
        setOcis(resOcis.data ?? [])
        setUnidades(resUnidades.data ?? [])

        try {
          const resProfissionais = await api.get('/profissionais?ativo=true&limit=200')
          const lista = (resProfissionais.data?.profissionais ?? resProfissionais.data ?? []) as ProfissionalOption[]
          setProfissionais(lista)
        } catch (e) {
          console.error('Erro ao carregar profissionais (médicos solicitantes):', e)
        }
      } catch (e) {
        console.error('Erro ao carregar OCIs/unidades:', e)
        setErro('Não foi possível carregar OCIs e unidades.')
      } finally {
        setLoadingDados(false)
      }
    }
    carregar()
  }, [open])

  useEffect(() => {
    if (open && valorUnidadeSolicitante) {
      setForm((f) => ({ ...f, unidadeOrigem: valorUnidadeSolicitante, unidadeOrigemId: unidadeSolicitanteId }))
    }
  }, [open, valorUnidadeSolicitante, unidadeSolicitanteId])

  const handleChange = (campo: string, valor: string) => {
    setForm((f) => {
      const next = { ...f, [campo]: valor }
      if (campo === 'pacienteBusca') next.pacienteId = ''
      if (campo === 'ociBusca') next.ociId = ''
      return next
    })
    setErro(null)
    setSucesso(null)
  }

  const ocisFiltrados = form.ociBusca.trim()
    ? ocis.filter((o) => {
      const textoCompleto = `${o.codigo} - ${o.nome}`
      return textoCompleto.toLowerCase().includes(form.ociBusca.trim().toLowerCase())
    })
    : ocis

  const selecionarOci = (o: OciOption) => {
    setForm((f) => ({
      ...f,
      ociId: o.id,
      ociBusca: `${o.codigo} - ${o.nome}`
    }))
    setShowOciDropdown(false)
  }

  const selecionarPaciente = (p: PacienteOption) => {
    setForm((f) => ({
      ...f,
      pacienteId: p.id,
      pacienteBusca: `${p.nome} — ${p.cpf}`
    }))
    setShowPacienteDropdown(false)
    setPacientesBusca([])
    setTimeout(() => {
      (ociInputRef.current?.querySelector('input') as HTMLInputElement)?.focus()
    }, 50)
  }

  const abrirCadastroPaciente = () => {
    setShowPacienteDropdown(false)
    setModalNovoPacienteAberto(true)
  }

  const onPacienteCadastrado = (paciente: { id: string; nome: string; cpf: string }) => {
    selecionarPaciente(paciente)
    setModalNovoPacienteAberto(false)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (pacienteInputRef.current && !pacienteInputRef.current.contains(target)) {
        setShowPacienteDropdown(false)
      }
      if (ociInputRef.current && !ociInputRef.current.contains(target)) {
        setShowOciDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesSelecionados = e.target.files
    if (!filesSelecionados || filesSelecionados.length === 0) {
      return
    }

    const files = Array.from(filesSelecionados).filter((f) => {
      if (f.type !== 'application/pdf') {
        console.warn('Arquivo ignorado (não é PDF):', f.name)
        return false
      }
      return true
    })

    const sobra = MAX_ANEXOS - arquivosPdf.length
    if (sobra <= 0) {
      alert(`Você já selecionou o máximo de ${MAX_ANEXOS} arquivos.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const novos = files.slice(0, sobra)
    const limiteMb = MAX_ANEXOS_MB * 1024 * 1024
    const ok = novos.filter((f) => {
      if (f.size > limiteMb) {
        console.warn('Arquivo ignorado (muito grande):', f.name, `${(f.size / 1024 / 1024).toFixed(2)} MB`)
        return false
      }
      return true
    })

    if (ok.length > 0) {
      setArquivosPdf((prev) => {
        const atualizados = [...prev, ...ok]
        console.log('📎 Arquivos adicionados. Total:', atualizados.length, atualizados.map(f => f.name))
        return atualizados
      })
    }

    // Limpar input para permitir selecionar o mesmo arquivo novamente se necessário
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removerAnexo = (idx: number) => {
    setArquivosPdf((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.pacienteId || !form.ociId || !form.unidadeOrigem.trim() || !form.medicoSolicitanteId) {
      setErro('Selecione ou cadastre um paciente, OCI, Unidade Solicitante e Médico Solicitante.')
      return
    }
    setSubmitting(true)
    setErro(null)
    setSucesso(null)
    // Guardar arquivos antes de qualquer operação (evita problemas de closure/estado)
    const arquivosParaUpload = arquivosPdf.length > 0 ? [...arquivosPdf] : []
    console.log('📎 Arquivos para upload:', arquivosParaUpload.length, arquivosParaUpload.map(f => ({ nome: f.name, tamanho: f.size })))

    try {
      const { data } = await api.post('/solicitacoes', {
        pacienteId: form.pacienteId,
        ociId: form.ociId,
        unidadeOrigem: form.unidadeOrigem.trim(),
        unidadeOrigemId: form.unidadeOrigemId || undefined,
        unidadeDestino: form.unidadeDestino.trim() || undefined,
        unidadeDestinoId: form.unidadeDestinoId || undefined,
        medicoSolicitanteId: form.medicoSolicitanteId || undefined,
        observacoes: form.observacoes.trim() || undefined
      })

      // Upload de anexos (apenas se houver arquivos válidos)
      let uploadSucesso = true
      let anexosEnviados = 0

      if (data?.id && arquivosParaUpload.length > 0) {
        const arquivosValidos = arquivosParaUpload.filter(f => f instanceof File && f.size > 0 && f.name)
        console.log('📎 Arquivos válidos para upload:', arquivosValidos.length)

        if (arquivosValidos.length > 0) {
          try {
            const formData = new FormData()
            arquivosValidos.forEach((f) => {
              console.log('📎 Adicionando ao FormData:', f.name, f.type, `${(f.size / 1024).toFixed(2)} KB`)
              formData.append('anexos', f, f.name)
            })
            console.log('📤 Enviando FormData com', arquivosValidos.length, 'arquivo(s)')
            // O interceptor do axios remove Content-Type quando detecta FormData
            const uploadRes = await api.post(`/solicitacoes/${data.id}/anexos`, formData)
            anexosEnviados = uploadRes.data?.count || arquivosValidos.length
            console.log('✅ Upload concluído:', anexosEnviados, 'anexo(s)')
          } catch (uploadErr: any) {
            uploadSucesso = false
            console.error('❌ Erro ao fazer upload de anexos:', uploadErr)
            const msgErro = uploadErr.response?.data?.message || uploadErr.message || 'Erro desconhecido no upload'
            setErro(`Solicitação criada, mas houve erro ao anexar documentos: ${msgErro}`)
          }
        } else {
          console.warn('⚠️ Nenhum arquivo válido encontrado para upload')
        }
      }

      // Mensagem de sucesso (só se não houver erro de upload)
      if (uploadSucesso) {
        const msgSucesso = anexosEnviados > 0
          ? `Solicitação criada com sucesso! Protocolo: ${data.numeroProtocolo} (${anexosEnviados} anexo(s) enviado(s))`
          : `Solicitação criada com sucesso! Protocolo: ${data.numeroProtocolo}`
        setSucesso(msgSucesso)
      }

      // Limpar formulário apenas após sucesso completo
      setForm(formInicial)
      setArquivosPdf([])
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Atualizar lista na página principal
      onSuccess?.()

      // Auto-limpar mensagem de sucesso após 5 segundos
      setTimeout(() => {
        setSucesso(null)
        setErro(null)
      }, 5000)
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Erro ao criar solicitação.'
      setErro(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const profissionaisFiltrados = form.unidadeOrigemId
    ? profissionais.filter((p) =>
      p.unidades?.some((u) => u.unidade?.id === form.unidadeOrigemId)
    )
    : profissionais

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-2 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Nova Solicitação</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
          {erro && (
            <div className="p-2 rounded bg-red-50 text-red-700 text-xs" role="alert">
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="p-2 rounded bg-green-50 text-green-700 text-xs flex items-center gap-1.5" role="alert">
              <CheckCircle size={14} className="shrink-0" />
              <span>{sucesso}</span>
            </div>
          )}
          {loadingDados ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : (
            <>
              <div ref={pacienteInputRef} className="relative">
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Paciente *</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={form.pacienteBusca}
                    onChange={(e) => handleChange('pacienteBusca', e.target.value)}
                    onFocus={() => form.pacienteBusca.length >= 2 && !form.pacienteId && setShowPacienteDropdown(true)}
                    placeholder="Digite nome, CPF ou CNS para buscar..."
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {loadingPacientes && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-primary-600" />
                    </div>
                  )}
                </div>
                {showPacienteDropdown && !form.pacienteId && (
                  <div className="absolute z-10 w-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
                    {pacientesBusca.length > 0 ? (
                      <>
                        {pacientesBusca.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => selecionarPaciente(p)}
                            className="w-full px-2 py-1.5 text-left text-xs hover:bg-gray-50 flex justify-between"
                          >
                            <span>{p.nome}</span>
                            <span className="text-gray-500">{p.cpf}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={abrirCadastroPaciente}
                          className="w-full px-2 py-1.5 text-left text-xs text-primary-600 hover:bg-primary-50 flex items-center gap-1 border-t border-gray-100"
                        >
                          <UserPlus size={12} />
                          Cadastrar novo paciente
                        </button>
                      </>
                    ) : (
                      form.pacienteBusca.length >= 2 && (
                        <button
                          type="button"
                          onClick={abrirCadastroPaciente}
                          className="w-full px-2 py-1.5 text-left text-xs text-primary-600 hover:bg-primary-50 flex items-center gap-1"
                        >
                          <UserPlus size={12} />
                          Nenhum paciente encontrado. Cadastrar novo
                        </button>
                      )
                    )}
                  </div>
                )}
                {form.pacienteId && form.pacienteBusca && (
                  <p className="mt-0.5 text-[10px] text-green-600">Paciente selecionado</p>
                )}
              </div>
              <div ref={ociInputRef} className="relative">
                <label className="block text-xs font-medium text-gray-700 mb-0.5">OCI *</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={form.ociBusca}
                    onChange={(e) => handleChange('ociBusca', e.target.value)}
                    onFocus={() => setShowOciDropdown(true)}
                    placeholder="Digite código ou nome da OCI para buscar..."
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                {showOciDropdown && (
                  <div className="absolute z-10 w-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
                    {ocisFiltrados.length > 0 ? (
                      ocisFiltrados.map((o) => {
                        const descricaoCompleta = `${o.codigo} - ${o.nome} (${o.tipo?.nome || 'Geral'})`
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => selecionarOci(o)}
                            title={descricaoCompleta}
                            className="w-full px-2 py-1.5 text-left text-xs hover:bg-gray-50 flex justify-between gap-1"
                          >
                            <span className="truncate">{o.codigo} - {o.nome}</span>
                            <span className="text-gray-500 shrink-0">{o.tipo?.nome || 'Geral'}</span>
                          </button>
                        )
                      })
                    ) : (
                      <p className="px-2 py-2 text-xs text-gray-500">Nenhuma OCI encontrada.</p>
                    )}
                  </div>
                )}
                {form.ociId && (
                  <p className="mt-0.5 text-[10px] text-green-600">OCI selecionada</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Unidade Solicitante *</label>
                <select
                  value={form.unidadeOrigemId}
                  onChange={(e) => {
                    const val = e.target.value
                    const u = unidades.find((un) => un.id === val)
                    if (u) {
                      setForm((f) => ({
                        ...f,
                        unidadeOrigem: `${u.cnes} - ${u.nome}`,
                        unidadeOrigemId: u.id
                      }))
                    }
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Selecione a unidade</option>
                  {unidades.map((u) => {
                    const valor = `${u.cnes} - ${u.nome}`
                    return (
                      <option key={u.id} value={u.id}>
                        {valor}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Médico solicitante *</label>
                <select
                  value={form.medicoSolicitanteId}
                  onChange={(e) => {
                    const val = e.target.value
                    setForm((f) => ({
                      ...f,
                      medicoSolicitanteId: val
                    }))
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="">Selecione o médico solicitante</option>
                  {profissionaisFiltrados.map((p) => {
                    const cboLabel = p.cboRelacao?.codigo
                      ? `${p.cboRelacao.codigo} - ${p.cboRelacao.descricao}`
                      : p.cbo || ''
                    return (
                      <option key={p.id} value={p.id}>
                        {p.nome}{cboLabel ? ` (${cboLabel})` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Unidade de destino (opcional)</label>
                <select
                  value={form.unidadeDestinoId}
                  onChange={(e) => {
                    const val = e.target.value
                    const u = unidades.find((un) => un.id === val)
                    setForm((f) => ({
                      ...f,
                      unidadeDestino: u ? `${u.cnes} - ${u.nome}` : '',
                      unidadeDestinoId: val || ''
                    }))
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Nenhuma</option>
                  {((unidades as UnidadeOption[]).filter((u) => u.executante === 1).length > 0
                    ? (unidades as UnidadeOption[]).filter((u) => u.executante === 1)
                    : unidades
                  ).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.cnes} - {u.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Observações (opcional)</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => handleChange('observacoes', e.target.value)}
                  placeholder="Observações da solicitação"
                  rows={2}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Anexar documentos PDF (opcional)
                </label>
                <p className="text-[10px] text-gray-500 mb-1">
                  Até {MAX_ANEXOS} arquivos, {MAX_ANEXOS_MB} MB cada. Apenas PDFs escaneados.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={handleFileChange}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                {arquivosPdf.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {arquivosPdf.map((f, idx) => (
                      <li
                        key={`${f.name}-${idx}`}
                        className="flex items-center justify-between gap-1.5 py-1 px-1.5 rounded bg-gray-50 text-xs"
                      >
                        <span className="flex items-center gap-1 min-w-0">
                          <FileText className="shrink-0 text-red-600" size={12} />
                          <span className="truncate" title={f.name}>
                            {f.name}
                          </span>
                          <span className="text-gray-400 shrink-0 text-[10px]">
                            ({(f.size / 1024).toFixed(1)} KB)
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removerAnexo(idx)}
                          className="p-0.5 rounded text-gray-500 hover:bg-red-50 hover:text-red-600"
                          aria-label="Remover anexo"
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
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
              disabled={loadingDados || submitting}
              className="flex-1 px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Criando…' : 'Criar solicitação'}
            </button>
          </div>
        </form>
      </div>

      <NovoPacienteModal
        open={modalNovoPacienteAberto}
        onClose={() => setModalNovoPacienteAberto(false)}
        onSuccess={onPacienteCadastrado}
      />
    </div>
  )
}
