import { useState, useEffect, useRef } from 'react'
import { X, Search, FileText, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

interface OciOption {
  id: string
  codigo: string
  nome: string
  tipo: string
}

interface UnidadeOption {
  id: string
  cnes: string
  nome: string
  ativo: boolean
}

interface ProfissionalOption {
  id: string
  nome: string
  cns: string
}

interface EditarSolicitacaoModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  solicitacao: any
  /** ID da solicitação (da URL) - usado na requisição PATCH para evitar 404 */
  solicitacaoId?: string
}

export default function EditarSolicitacaoModal({
  open,
  onClose,
  onSuccess,
  solicitacao,
  solicitacaoId: solicitacaoIdProp
}: EditarSolicitacaoModalProps) {
  const solicitacaoId = solicitacaoIdProp ?? solicitacao?.id

  const [form, setForm] = useState({
    observacoes: '',
    unidadeOrigem: '',
    unidadeOrigemId: '',
    unidadeDestino: '',
    unidadeDestinoId: '',
    unidadeOrigemBusca: '',
    unidadeDestinoBusca: '',
    ociId: '',
    ociBusca: '',
    medicoSolicitanteId: ''
  })
  const [ocis, setOcis] = useState<OciOption[]>([])
  const [unidades, setUnidades] = useState<UnidadeOption[]>([])
  const [profissionais, setProfissionais] = useState<ProfissionalOption[]>([])
  const [loadingOcis, setLoadingOcis] = useState(false)
  const [loadingUnidades, setLoadingUnidades] = useState(false)
  const [loadingProfissionais, setLoadingProfissionais] = useState(false)
  const [showOciDropdown, setShowOciDropdown] = useState(false)
  const [showUnidadeOrigemDropdown, setShowUnidadeOrigemDropdown] = useState(false)
  const [showUnidadeDestinoDropdown, setShowUnidadeDestinoDropdown] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [arquivosPdf, setArquivosPdf] = useState<File[]>([])
  const [removendoAnexoId, setRemovendoAnexoId] = useState<string | null>(null)
  const ociInputRef = useRef<HTMLDivElement>(null)
  const unidadeOrigemRef = useRef<HTMLDivElement>(null)
  const unidadeDestinoRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { usuario } = useAuth()
  const podeRemoverAnexos = usuario?.tipo === 'ADMIN' || usuario?.tipo === 'GESTOR'

  const MAX_ANEXOS = 10
  const MAX_ANEXOS_MB = 10

  // Pode alterar OCI apenas quando nenhum procedimento foi registrado (todos PENDENTE e sem dataExecucao)
  const podeAlterarOci =
    solicitacao?.execucoes?.length > 0
      ? solicitacao.execucoes.every(
          (e: any) => e.status === 'PENDENTE' && e.dataExecucao == null
        )
      : true

  useEffect(() => {
    if (open && solicitacao) {
      const ociId = solicitacao.ociId || solicitacao.oci?.id || ''
      const ociBusca = solicitacao.oci
        ? `${solicitacao.oci.codigo} - ${solicitacao.oci.nome}`
        : ''
      const uOrigem = solicitacao.unidadeOrigem || ''
      const uDestino = solicitacao.unidadeDestino || ''
      const uOrigemId = solicitacao.unidadeOrigemId || solicitacao.unidadeOrigemRef?.id || ''
      const uDestinoId = solicitacao.unidadeDestinoId || solicitacao.unidadeDestinoRef?.id || ''
      const medicoSolicitanteId = solicitacao.medicoSolicitanteId || solicitacao.medicoSolicitante?.id || ''
      setForm({
        observacoes: solicitacao.observacoes || '',
        unidadeOrigem: uOrigem,
        unidadeOrigemId: uOrigemId,
        unidadeDestino: uDestino,
        unidadeDestinoId: uDestinoId,
        unidadeOrigemBusca: uOrigem,
        unidadeDestinoBusca: uDestino,
        ociId,
        ociBusca,
        medicoSolicitanteId
      })
      setArquivosPdf([])
      setErro(null)
      setSucesso(null)
    }
  }, [open, solicitacao])

  useEffect(() => {
    if (open && podeAlterarOci) {
      setLoadingOcis(true)
      api.get('/ocis?ativo=true')
        .then((res: { data: OciOption[] }) => setOcis(Array.isArray(res.data) ? res.data : []))
        .catch(() => setOcis([]))
        .finally(() => setLoadingOcis(false))
    }
  }, [open, podeAlterarOci])

  useEffect(() => {
    if (open) {
      setLoadingUnidades(true)
      api.get('/unidades?ativo=true')
        .then((res: { data: UnidadeOption[] }) => setUnidades(Array.isArray(res.data) ? res.data : []))
        .catch(() => setUnidades([]))
        .finally(() => setLoadingUnidades(false))
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setLoadingProfissionais(true)
      api.get('/profissionais?ativo=true&limit=200')
        .then((res: { data: { profissionais?: ProfissionalOption[] } | ProfissionalOption[] }) => {
          const data = res.data as any
          const lista = Array.isArray(data) ? data : data.profissionais || []
          setProfissionais(lista)
        })
        .catch(() => setProfissionais([]))
        .finally(() => setLoadingProfissionais(false))
    }
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (ociInputRef.current && !ociInputRef.current.contains(target)) setShowOciDropdown(false)
      if (unidadeOrigemRef.current && !unidadeOrigemRef.current.contains(target)) setShowUnidadeOrigemDropdown(false)
      if (unidadeDestinoRef.current && !unidadeDestinoRef.current.contains(target)) setShowUnidadeDestinoDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const ocisFiltrados =
    form.ociBusca.trim()
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

  const labelUnidade = (u: UnidadeOption) => `${u.cnes} - ${u.nome}`

  const unidadesFiltradasOrigem = form.unidadeOrigemBusca.trim()
    ? unidades.filter((u) =>
        labelUnidade(u).toLowerCase().includes(form.unidadeOrigemBusca.trim().toLowerCase())
      )
    : unidades

  const unidadesFiltradasDestino = form.unidadeDestinoBusca.trim()
    ? unidades.filter((u) =>
        labelUnidade(u).toLowerCase().includes(form.unidadeDestinoBusca.trim().toLowerCase())
      )
    : unidades

  const selecionarUnidadeOrigem = (u: UnidadeOption) => {
    const valor = labelUnidade(u)
    setForm((f) => ({
      ...f,
      unidadeOrigem: valor,
      unidadeOrigemId: u.id,
      unidadeOrigemBusca: valor
    }))
    setShowUnidadeOrigemDropdown(false)
  }

  const selecionarUnidadeDestino = (u: UnidadeOption) => {
    const valor = labelUnidade(u)
    setForm((f) => ({
      ...f,
      unidadeDestino: valor,
      unidadeDestinoId: u.id,
      unidadeDestinoBusca: valor
    }))
    setShowUnidadeDestinoDropdown(false)
  }

  const anexosExistentes = solicitacao?.anexos ?? []
  const totalAnexosPermitido = MAX_ANEXOS
  const vagasParaNovos = Math.max(0, totalAnexosPermitido - anexosExistentes.length)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const pdfs = Array.from(files).filter((f) => f.type === 'application/pdf')
    const sobra = vagasParaNovos - arquivosPdf.length
    if (sobra <= 0) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    const limiteMb = MAX_ANEXOS_MB * 1024 * 1024
    const validos = pdfs.slice(0, sobra).filter((f) => f.size <= limiteMb)
    if (validos.length > 0) {
      setArquivosPdf((prev) => [...prev, ...validos])
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removerAnexo = (idx: number) => {
    setArquivosPdf((prev) => prev.filter((_, i) => i !== idx))
  }

  const removerAnexoExistente = async (anexoId: string) => {
    if (!window.confirm('Remover este anexo? O arquivo será excluído da solicitação.')) return
    if (!solicitacaoId) return
    setRemovendoAnexoId(anexoId)
    setErro(null)
    try {
      const { api } = await import('../services/api')
      await api.delete(`/solicitacoes/${solicitacaoId}/anexos/${anexoId}`)
      onSuccess?.()
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao remover anexo.'
      setErro(msg)
    } finally {
      setRemovendoAnexoId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setSucesso(null)

    if (!form.unidadeOrigem.trim()) {
      setErro('Unidade Solicitante é obrigatória')
      return
    }

    if (!form.medicoSolicitanteId) {
      setErro('Médico Solicitante é obrigatório')
      return
    }

    setSubmitting(true)
    try {
      const { api } = await import('../services/api')

      const payload: any = {
        observacoes: form.observacoes.trim() || null,
        unidadeOrigem: form.unidadeOrigem.trim(),
        unidadeOrigemId: form.unidadeOrigemId || null,
        unidadeDestino: form.unidadeDestino.trim() || null,
        unidadeDestinoId: form.unidadeDestinoId || null,
        medicoSolicitanteId: form.medicoSolicitanteId
      }
      if (podeAlterarOci && form.ociId && form.ociId !== (solicitacao?.ociId || solicitacao?.oci?.id)) {
        payload.ociId = form.ociId
      }

      if (!solicitacaoId) {
        setErro('ID da solicitação não informado. Feche e abra o modal novamente.')
        return
      }
      await api.patch(`/solicitacoes/${solicitacaoId}`, payload)

      let anexosEnviados = 0
      if (arquivosPdf.length > 0) {
        try {
          const formData = new FormData()
          arquivosPdf.forEach((f) => formData.append('anexos', f, f.name))
          const uploadRes = await api.post(`/solicitacoes/${solicitacaoId}/anexos`, formData)
          anexosEnviados = uploadRes.data?.count ?? arquivosPdf.length
        } catch (uploadErr: any) {
          console.error('Erro ao enviar anexos:', uploadErr)
          setErro('Solicitação atualizada, mas falha ao enviar anexos: ' + (uploadErr.response?.data?.message || uploadErr.message))
          return
        }
      }

      const msgSucesso = anexosEnviados > 0
        ? `Solicitação atualizada com sucesso! ${anexosEnviados} anexo(s) enviado(s).`
        : 'Solicitação atualizada com sucesso!'
      setSucesso(msgSucesso)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (error: any) {
      console.error('Erro ao atualizar solicitação:', error)
      const msg = error.response?.data?.message || 'Erro ao atualizar solicitação.'
      const idRecebido = error.response?.data?.idRecebido
      setErro(idRecebido ? `${msg} ID consultado no servidor: ${idRecebido}. Confira se a URL da página é /solicitacoes/${solicitacaoId} e se o backend está conectado ao mesmo banco.` : msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-gray-200">
          <div>
            <h2 className="text-base font-bold text-gray-900">Editar Solicitação</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Protocolo: {solicitacao?.numeroProtocolo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
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

          {/* Paciente (somente leitura) */}
          <div className="bg-gray-50 p-2 rounded">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Paciente
            </label>
            <p className="text-xs text-gray-900">
              {solicitacao?.paciente?.nome} - CPF: {solicitacao?.paciente?.cpf}
            </p>
          </div>

          {/* OCI: editável apenas quando nenhum procedimento foi registrado */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              OCI (Oferta de Cuidados Integrados)
            </label>
            {podeAlterarOci && ocis.length > 0 ? (
              <div ref={ociInputRef} className="relative">
                <div className="relative">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={form.ociBusca}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        ociBusca: e.target.value,
                        ociId: ''
                      }))
                    }
                    onFocus={() => setShowOciDropdown(true)}
                    placeholder="Digite código ou nome da OCI para buscar..."
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    disabled={loadingOcis}
                  />
                </div>
                {showOciDropdown && (
                  <div className="absolute z-10 w-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
                    {ocisFiltrados.length > 0 ? (
                      ocisFiltrados.map((o) => {
                        const descricaoCompleta = `${o.codigo} - ${o.nome} (${o.tipo === 'GERAL' ? 'Geral' : 'Oncológico'})`
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => selecionarOci(o)}
                            title={descricaoCompleta}
                            className="w-full px-2 py-1.5 text-left text-xs hover:bg-gray-50 flex justify-between gap-2 border-b border-gray-100 last:border-0"
                          >
                            <span className="truncate">
                              {o.codigo} - {o.nome}
                            </span>
                            <span className="text-gray-500 shrink-0">
                              {o.tipo === 'GERAL' ? 'Geral' : 'Oncológico'}
                            </span>
                          </button>
                        )
                      })
                    ) : (
                      <p className="px-2 py-2 text-xs text-gray-500">Nenhuma OCI encontrada.</p>
                    )}
                  </div>
                )}
                {form.ociId && (
                  <p className="mt-1 text-xs text-green-600">OCI selecionada</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Você pode alterar a OCI pois nenhum procedimento foi registrado nesta solicitação.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {solicitacao?.oci?.codigo} - {solicitacao?.oci?.nome}
                </p>
                {!podeAlterarOci && (
                  <p className="text-xs text-amber-700 mt-1">
                    A OCI não pode ser alterada porque já existe pelo menos um procedimento registrado (executado ou agendado).
                  </p>
                )}
              </>
            )}
          </div>

          {/* Unidade Solicitante */}
          <div ref={unidadeOrigemRef} className="relative">
            <label htmlFor="unidadeOrigem" className="block text-xs font-medium text-gray-700 mb-0.5">
              Unidade Solicitante <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="unidadeOrigem"
                type="text"
                value={form.unidadeOrigemBusca}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    unidadeOrigemBusca: e.target.value,
                    unidadeOrigem: ''
                  }))
                }
                onFocus={() => setShowUnidadeOrigemDropdown(true)}
                placeholder="Digite CNES ou nome da Unidade Solicitante..."
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                disabled={loadingUnidades}
              />
            </div>
            {showUnidadeOrigemDropdown && (
              <div className="absolute z-10 w-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
                {unidadesFiltradasOrigem.length > 0 ? (
                  unidadesFiltradasOrigem.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selecionarUnidadeOrigem(u)}
                      className="w-full px-2 py-1.5 text-left text-xs hover:bg-gray-50 flex justify-between gap-2 border-b border-gray-100 last:border-0"
                    >
                      <span className="truncate">{u.nome}</span>
                      <span className="text-gray-500 shrink-0">CNES {u.cnes}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-2 py-2 text-xs text-gray-500">Nenhuma unidade encontrada.</p>
                )}
              </div>
            )}
            {form.unidadeOrigem && (
              <p className="mt-1 text-xs text-green-600">Unidade Solicitante selecionada</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Informe o código CNES ou nome da Unidade Solicitante
            </p>
          </div>

          {/* Unidade Executante */}
          <div ref={unidadeDestinoRef} className="relative">
            <label htmlFor="unidadeDestino" className="block text-xs font-medium text-gray-700 mb-0.5">
              Unidade Executante
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="unidadeDestino"
                type="text"
                value={form.unidadeDestinoBusca}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    unidadeDestinoBusca: e.target.value,
                    unidadeDestino: ''
                  }))
                }
                onFocus={() => setShowUnidadeDestinoDropdown(true)}
                placeholder="Opcional: digite CNES ou nome da Unidade Executante..."
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                disabled={loadingUnidades}
              />
            </div>
            {showUnidadeDestinoDropdown && (
              <div className="absolute z-10 w-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
                {unidadesFiltradasDestino.length > 0 ? (
                  unidadesFiltradasDestino.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selecionarUnidadeDestino(u)}
                      className="w-full px-2 py-1.5 text-left text-xs hover:bg-gray-50 flex justify-between gap-2 border-b border-gray-100 last:border-0"
                    >
                      <span className="truncate">{u.nome}</span>
                      <span className="text-gray-500 shrink-0">CNES {u.cnes}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-2 py-2 text-xs text-gray-500">Nenhuma unidade encontrada.</p>
                )}
              </div>
            )}
            {form.unidadeDestino && (
              <p className="mt-1 text-xs text-green-600">Unidade de destino selecionada</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Opcional: Unidade Executante onde os procedimentos serão realizados
            </p>
          </div>

          {/* Médico Solicitante */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Médico Solicitante <span className="text-red-500">*</span>
            </label>
            <select
              value={form.medicoSolicitanteId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  medicoSolicitanteId: e.target.value
                }))
              }
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              disabled={loadingProfissionais}
            >
              <option value="">Selecione o médico solicitante</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Observações */}
          <div>
            <label htmlFor="observacoes" className="block text-xs font-medium text-gray-700 mb-0.5">
              Observações
            </label>
            <textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={3}
              placeholder="Informações adicionais sobre a solicitação..."
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          {/* Anexos PDF: sempre visível — anexar primeiro arquivo, acrescentar ou ver existentes */}
          <div className="border border-gray-200 rounded p-3 bg-gray-50/80">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Documentos PDF (anexar ou acrescentar)
            </label>
            {anexosExistentes.length === 0 ? (
              <p className="text-xs text-gray-600 mb-2">
                Nenhum documento anexado ainda. Você pode anexar um ou mais PDFs abaixo (até {totalAnexosPermitido} arquivos, {MAX_ANEXOS_MB} MB cada).
              </p>
            ) : (
              <>
                <p className="text-[10px] text-gray-600 mb-1.5">
                  Já anexados nesta solicitação: {anexosExistentes.length} arquivo(s). Você pode acrescentar mais abaixo (máx. {totalAnexosPermitido} no total).
                </p>
                <ul className="mb-2 space-y-0.5">
                  {anexosExistentes.map((a: any) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-white border border-gray-100 text-xs"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <FileText className="shrink-0 text-red-600" size={14} />
                        <span className="truncate" title={a.nomeOriginal}>{a.nomeOriginal}</span>
                      </span>
                      {podeRemoverAnexos && (
                        <button
                          type="button"
                          onClick={() => removerAnexoExistente(a.id)}
                          disabled={removendoAnexoId === a.id}
                          className="p-1 rounded text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Remover anexo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {vagasParaNovos <= 0 ? (
              <p className="text-[10px] text-amber-600">
                Limite de {totalAnexosPermitido} anexos atingido. Não é possível adicionar mais arquivos.
              </p>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={handleFileChange}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Até {vagasParaNovos} arquivo(s) novo(s), {MAX_ANEXOS_MB} MB cada. Apenas PDFs.
                </p>
              </>
            )}
            {arquivosPdf.length > 0 && (
              <ul className="mt-2 space-y-0.5 border-t border-gray-200 pt-2">
                <p className="text-[10px] font-medium text-gray-600 mb-0.5">Novos arquivos a enviar:</p>
                {arquivosPdf.map((f, idx) => (
                  <li
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-white border border-gray-100 text-xs"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <FileText className="shrink-0 text-red-600" size={14} />
                      <span className="truncate" title={f.name}>{f.name}</span>
                      <span className="text-gray-400 shrink-0 text-xs">({(f.size / 1024).toFixed(1)} KB)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removerAnexo(idx)}
                      className="p-1 rounded text-gray-500 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remover anexo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Aviso */}
          <div className="bg-blue-50 border border-blue-200 p-2 rounded">
            <p className="text-xs text-blue-800">
              <strong>Nota:</strong> O paciente não pode ser alterado. A OCI só pode ser alterada quando nenhum procedimento tiver sido registrado (executado ou agendado).
              Ao trocar a OCI, os procedimentos da solicitação serão substituídos pelos da nova OCI.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
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
              disabled={submitting}
              className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
