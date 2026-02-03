import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { X, FileCheck } from 'lucide-react'

interface RegistroAutorizacaoApacModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  solicitacaoId: string
  dadosAtuais?: {
    numeroAutorizacaoApac?: string | null
    nomeProfissionalAutorizador?: string | null
    cnsProfissionalAutorizador?: string | null
    dataAutorizacaoApac?: string | null
    tipoOci?: string | null
    motivoSaida?: string | null
    dataDiagnosticoCitoHistopatologico?: string | null
    cidPrincipal?: string | null
    cidSecundario?: string | null
  }
}

interface ProfissionalOption {
  id: string
  nome: string
  cns: string
  cbo: string
}

const formInicial = {
  numeroAutorizacaoApac: '',
  profissionalId: '',
  nomeProfissionalAutorizador: '',
  cnsProfissionalAutorizador: '',
  dataAutorizacaoApac: '',
  motivoSaida: '',
  dataDiagnosticoCitoHistopatologico: '',
  cidPrincipal: '',
  cidSecundario: ''
}

const motivosSaidaPermitidos = [
  { valor: '1.1', label: '1.1 - Alta Curado' },
  { valor: '1.2', label: '1.2 - Alta Melhorado' },
  { valor: '1.4', label: '1.4 - Alta a pedido' },
  { valor: '1.5', label: '1.5 - Alta com previsão de retorno para acompanhamento do paciente' },
  { valor: '4.1', label: '4.1 - Óbito - Com declaração de óbito fornecida pelo médico assistente' },
  { valor: '4.2', label: '4.2 - Óbito - Com declaração de óbito fornecida pelo Instituto Médico Legal - IML' },
  { valor: '4.3', label: '4.3 - Óbito - Com declaração de óbito fornecida pelo Serviço de Verificação de óbito - SVO' }
]

export default function RegistroAutorizacaoApacModal({
  open,
  onClose,
  onSuccess,
  solicitacaoId,
  dadosAtuais
}: RegistroAutorizacaoApacModalProps) {
  const [form, setForm] = useState(formInicial)
  const [profissionais, setProfissionais] = useState<ProfissionalOption[]>([])
  const [loadingProfissionais, setLoadingProfissionais] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    
    // Carregar profissionais
    const carregarProfissionais = async () => {
      setLoadingProfissionais(true)
      try {
        const response = await api.get('/profissionais?ativo=true&limit=200')
        const profissionaisCarregados = response.data.profissionais || []
        setProfissionais(profissionaisCarregados)
        
        // Preencher formulário com dados atuais se existirem
        if (dadosAtuais) {
          // Tentar encontrar o profissional pelo CNS
          const cnsLimpo = dadosAtuais.cnsProfissionalAutorizador?.replace(/\D/g, '') || ''
          const profissionalEncontrado = profissionaisCarregados.find(
            (p: ProfissionalOption) => p.cns === cnsLimpo
          )
          
          setForm({
            numeroAutorizacaoApac: dadosAtuais.numeroAutorizacaoApac || '',
            profissionalId: profissionalEncontrado?.id || '',
            nomeProfissionalAutorizador: dadosAtuais.nomeProfissionalAutorizador || '',
            cnsProfissionalAutorizador: dadosAtuais.cnsProfissionalAutorizador 
              ? dadosAtuais.cnsProfissionalAutorizador.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')
              : '',
            dataAutorizacaoApac: dadosAtuais.dataAutorizacaoApac 
              ? new Date(dadosAtuais.dataAutorizacaoApac).toISOString().split('T')[0]
              : '',
            motivoSaida: dadosAtuais.motivoSaida || '',
            dataDiagnosticoCitoHistopatologico: dadosAtuais.dataDiagnosticoCitoHistopatologico
              ? new Date(dadosAtuais.dataDiagnosticoCitoHistopatologico).toISOString().split('T')[0]
              : '',
            cidPrincipal: dadosAtuais.cidPrincipal || '',
            cidSecundario: dadosAtuais.cidSecundario || ''
          })
        } else {
          setForm(formInicial)
        }
      } catch (error) {
        console.error('Erro ao carregar profissionais:', error)
        // Mesmo com erro, preencher formulário se houver dados atuais
        if (dadosAtuais) {
          setForm({
            numeroAutorizacaoApac: dadosAtuais.numeroAutorizacaoApac || '',
            profissionalId: '',
            nomeProfissionalAutorizador: dadosAtuais.nomeProfissionalAutorizador || '',
            cnsProfissionalAutorizador: dadosAtuais.cnsProfissionalAutorizador 
              ? dadosAtuais.cnsProfissionalAutorizador.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')
              : '',
            dataAutorizacaoApac: dadosAtuais.dataAutorizacaoApac 
              ? new Date(dadosAtuais.dataAutorizacaoApac).toISOString().split('T')[0]
              : '',
            motivoSaida: dadosAtuais.motivoSaida || '',
            dataDiagnosticoCitoHistopatologico: dadosAtuais.dataDiagnosticoCitoHistopatologico
              ? new Date(dadosAtuais.dataDiagnosticoCitoHistopatologico).toISOString().split('T')[0]
              : '',
            cidPrincipal: dadosAtuais.cidPrincipal || '',
            cidSecundario: dadosAtuais.cidSecundario || ''
          })
        } else {
          setForm(formInicial)
        }
      } finally {
        setLoadingProfissionais(false)
      }
    }
    
    carregarProfissionais()
    setErro(null)
    setSucesso(null)
  }, [open, dadosAtuais])
  
  const handleProfissionalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profissionalId = e.target.value
    const profissional = profissionais.find(p => p.id === profissionalId)
    
    if (profissional) {
      setForm({
        ...form,
        profissionalId,
        nomeProfissionalAutorizador: profissional.nome,
        cnsProfissionalAutorizador: profissional.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')
      })
    } else {
      setForm({
        ...form,
        profissionalId: '',
        nomeProfissionalAutorizador: '',
        cnsProfissionalAutorizador: ''
      })
    }
  }

  const validarNumeroApac = (numero: string): { valido: boolean; erro?: string } => {
    if (!numero || typeof numero !== 'string') {
      return { valido: false, erro: 'O número de autorização APAC é obrigatório.' };
    }

    const numeroLimpo = numero.replace(/\D/g, '');

    if (numeroLimpo.length !== 13) {
      return {
        valido: false,
        erro: `O número de autorização APAC deve conter exatamente 13 dígitos. Fornecido: ${numeroLimpo.length} dígito(s).`
      };
    }

    if (!/^\d{13}$/.test(numeroLimpo)) {
      return {
        valido: false,
        erro: 'O número de autorização APAC deve conter apenas dígitos numéricos.'
      };
    }

    const quintoDigito = numeroLimpo.charAt(4);
    if (quintoDigito !== '7') {
      return {
        valido: false,
        erro: `O 5º dígito do número de autorização APAC deve ser "7" (sete), conforme Portaria SAES/MS nº 1640/2024. Valor encontrado: "${quintoDigito}".`
      };
    }

    return { valido: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setSucesso(null)

    // Validações
    if (!form.numeroAutorizacaoApac.trim()) {
      setErro('O número da autorização APAC é obrigatório.')
      return
    }

    // Validar formato do número de autorização APAC
    const validacaoApac = validarNumeroApac(form.numeroAutorizacaoApac)
    if (!validacaoApac.valido) {
      setErro(validacaoApac.erro || 'Número de autorização APAC inválido.')
      return
    }

    if (!form.nomeProfissionalAutorizador.trim()) {
      setErro('O nome do profissional autorizador é obrigatório.')
      return
    }

    if (!form.cnsProfissionalAutorizador.trim()) {
      setErro('O Cartão Nacional de Saúde (CNS) é obrigatório.')
      return
    }

    // Validar formato do CNS (15 dígitos)
    const cnsLimpo = form.cnsProfissionalAutorizador.replace(/\D/g, '')
    if (cnsLimpo.length !== 15) {
      setErro('O CNS deve conter 15 dígitos.')
      return
    }

    if (!form.dataAutorizacaoApac) {
      setErro('A data da autorização é obrigatória.')
      return
    }

    // Remover formatação do número APAC antes de enviar
    const numeroApacLimpo = form.numeroAutorizacaoApac.replace(/\D/g, '')

    setSubmitting(true)
    try {
      const payload: any = {
        numeroAutorizacaoApac: numeroApacLimpo,
        nomeProfissionalAutorizador: form.nomeProfissionalAutorizador.trim(),
        cnsProfissionalAutorizador: cnsLimpo,
        dataAutorizacaoApac: new Date(form.dataAutorizacaoApac).toISOString()
      }

      // Adicionar motivo de saída se fornecido
      if (form.motivoSaida) {
        payload.motivoSaida = form.motivoSaida
      }

      // Adicionar campos oncológicos se for OCI oncológica
      if (dadosAtuais?.tipoOci === 'ONCOLOGICO') {
        if (form.dataDiagnosticoCitoHistopatologico) {
          payload.dataDiagnosticoCitoHistopatologico = new Date(form.dataDiagnosticoCitoHistopatologico).toISOString()
        }
        if (form.cidPrincipal) {
          payload.cidPrincipal = form.cidPrincipal.trim()
        }
        if (form.cidSecundario) {
          payload.cidSecundario = form.cidSecundario.trim()
        }
      }

      await api.patch(`/solicitacoes/${solicitacaoId}/autorizacao-apac`, payload)

      setSucesso('Autorização APAC registrada com sucesso!')
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (error: any) {
      console.error('Erro ao registrar autorização APAC:', error)
      setErro(error.response?.data?.message || 'Erro ao registrar autorização APAC.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    // Limitar a 15 dígitos
    if (value.length > 15) {
      value = value.substring(0, 15)
    }
    // Formatar: XXX XXXX XXXX XXXX
    if (value.length > 11) {
      value = `${value.substring(0, 3)} ${value.substring(3, 7)} ${value.substring(7, 11)} ${value.substring(11)}`
    } else if (value.length > 7) {
      value = `${value.substring(0, 3)} ${value.substring(3, 7)} ${value.substring(7)}`
    } else if (value.length > 3) {
      value = `${value.substring(0, 3)} ${value.substring(3)}`
    }
    setForm({ ...form, cnsProfissionalAutorizador: value })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded">
              <FileCheck className="text-blue-600" size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Registro de Autorização APAC</h2>
              <p className="text-xs text-gray-500">Preencha os dados da autorização</p>
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
        <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
          {/* Mensagens de erro e sucesso */}
          {erro && (
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-xs text-red-800">{erro}</p>
            </div>
          )}

          {sucesso && (
            <div className="p-2 bg-green-50 border border-green-200 rounded">
              <p className="text-xs text-green-800">{sucesso}</p>
            </div>
          )}

          {/* Número da Autorização APAC */}
          <div>
            <label htmlFor="numeroAutorizacaoApac" className="block text-xs font-medium text-gray-700 mb-0.5">
              Nº Autorização APAC <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="numeroAutorizacaoApac"
              value={form.numeroAutorizacaoApac}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '')
                // Limitar a 13 dígitos
                if (value.length > 13) {
                  value = value.substring(0, 13)
                }
                // Formatar: XXXX7-XXXXXXX (com hífen após o 5º dígito)
                let formatted = value
                if (value.length > 5) {
                  formatted = `${value.substring(0, 4)}${value.charAt(4)}-${value.substring(5)}`
                } else if (value.length > 4) {
                  formatted = `${value.substring(0, 4)}${value.charAt(4)}`
                }
                setForm({ ...form, numeroAutorizacaoApac: formatted })
              }}
              className={`w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                form.numeroAutorizacaoApac && form.numeroAutorizacaoApac.replace(/\D/g, '').length === 13 && form.numeroAutorizacaoApac.replace(/\D/g, '').charAt(4) !== '7'
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
              placeholder="Ex: 1234712345678 (13 dígitos, 5º deve ser 7)"
              disabled={submitting}
              maxLength={14} // 13 dígitos + 1 hífen
              required
            />
            <p className="mt-0.5 text-[10px] text-gray-500">
              Formato: 13 dígitos. 5º dígito deve ser "7" (Portaria SAES/MS nº 1640/2024).
            </p>
            {form.numeroAutorizacaoApac && form.numeroAutorizacaoApac.replace(/\D/g, '').length === 13 && form.numeroAutorizacaoApac.replace(/\D/g, '').charAt(4) !== '7' && (
              <p className="mt-0.5 text-[10px] text-red-600">
                ⚠️ 5º dígito deve ser "7". Valor: "{form.numeroAutorizacaoApac.replace(/\D/g, '').charAt(4)}"
              </p>
            )}
          </div>

          {/* Seleção de Profissional */}
          <div>
            <label htmlFor="profissionalId" className="block text-xs font-medium text-gray-700 mb-0.5">
              Profissional Autorizador <span className="text-red-500">*</span>
            </label>
            <select
              id="profissionalId"
              value={form.profissionalId}
              onChange={handleProfissionalChange}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              disabled={submitting || loadingProfissionais}
              required
            >
              <option value="">Selecione um profissional...</option>
              {profissionais.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.nome} - CNS: {prof.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')} - CBO: {prof.cbo}
                </option>
              ))}
            </select>
            {loadingProfissionais && (
              <p className="mt-0.5 text-[10px] text-gray-500">Carregando profissionais...</p>
            )}
          </div>

          {/* Nome do Profissional Autorizador (preenchido automaticamente) */}
          <div>
            <label htmlFor="nomeProfissionalAutorizador" className="block text-xs font-medium text-gray-700 mb-0.5">
              Nome Profissional <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="nomeProfissionalAutorizador"
              value={form.nomeProfissionalAutorizador}
              onChange={(e) => setForm({ ...form, nomeProfissionalAutorizador: e.target.value })}
              className={`w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                form.profissionalId ? 'bg-gray-50' : ''
              }`}
              placeholder={form.profissionalId ? 'Preenchido automaticamente' : 'Ex: Dr. João Silva'}
              disabled={submitting || !!form.profissionalId}
              required
            />
            {form.profissionalId && (
              <p className="mt-0.5 text-[10px] text-blue-600">Preenchido automaticamente.</p>
            )}
          </div>

          {/* CNS - Cartão Nacional de Saúde (preenchido automaticamente) */}
          <div>
            <label htmlFor="cnsProfissionalAutorizador" className="block text-xs font-medium text-gray-700 mb-0.5">
              CNS <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="cnsProfissionalAutorizador"
              value={form.cnsProfissionalAutorizador}
              onChange={handleCnsChange}
              className={`w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                form.profissionalId ? 'bg-gray-50' : ''
              }`}
              placeholder="000 0000 0000 0000"
              maxLength={18}
              disabled={submitting || !!form.profissionalId}
              required
            />
            {form.profissionalId ? (
              <p className="mt-0.5 text-[10px] text-blue-600">Preenchido automaticamente.</p>
            ) : (
              <p className="mt-0.5 text-[10px] text-gray-500">Formato: 15 dígitos</p>
            )}
          </div>

          {/* Data da Autorização */}
          <div>
            <label htmlFor="dataAutorizacaoApac" className="block text-xs font-medium text-gray-700 mb-0.5">
              Data da Autorização <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="dataAutorizacaoApac"
              value={form.dataAutorizacaoApac}
              onChange={(e) => setForm({ ...form, dataAutorizacaoApac: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              disabled={submitting}
              required
            />
          </div>

          {/* Motivo de Saída (opcional, para encerramento APAC) */}
          <div>
            <label htmlFor="motivoSaida" className="block text-xs font-medium text-gray-700 mb-0.5">
              Motivo de Saída (opcional)
            </label>
            <select
              id="motivoSaida"
              value={form.motivoSaida}
              onChange={(e) => setForm({ ...form, motivoSaida: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              disabled={submitting}
            >
              <option value="">Selecione um motivo (opcional)</option>
              {motivosSaidaPermitidos.map((motivo) => (
                <option key={motivo.valor} value={motivo.valor}>
                  {motivo.label}
                </option>
              ))}
            </select>
            <p className="mt-0.5 text-[10px] text-gray-500">
              Obrigatório apenas ao encerrar a APAC.
            </p>
          </div>

          {/* Campos específicos para OCI Oncológica */}
          {dadosAtuais?.tipoOci === 'ONCOLOGICO' && (
            <>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <h3 className="text-xs font-semibold text-gray-900 mb-2">Dados Complementares - Oncologia</h3>
                
                {/* Data Diagnóstico Cito/Histopatológico */}
                <div className="mb-2">
                  <label htmlFor="dataDiagnosticoCitoHistopatologico" className="block text-xs font-medium text-gray-700 mb-0.5">
                    Data Diagnóstico Cito/Histopatológico
                  </label>
                  <input
                    type="date"
                    id="dataDiagnosticoCitoHistopatologico"
                    value={form.dataDiagnosticoCitoHistopatologico}
                    onChange={(e) => setForm({ ...form, dataDiagnosticoCitoHistopatologico: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    disabled={submitting}
                  />
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    Obrigatório quando procedimento secundário possuir atributo "055".
                  </p>
                </div>

                {/* CID Principal */}
                <div className="mb-2">
                  <label htmlFor="cidPrincipal" className="block text-xs font-medium text-gray-700 mb-0.5">
                    CID Principal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="cidPrincipal"
                    value={form.cidPrincipal}
                    onChange={(e) => setForm({ ...form, cidPrincipal: e.target.value.toUpperCase() })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: C50.9"
                    disabled={submitting}
                    required
                  />
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    Essencial ao monitoramento do tratamento oncológico.
                  </p>
                </div>

                {/* CID Secundário */}
                <div>
                  <label htmlFor="cidSecundario" className="block text-xs font-medium text-gray-700 mb-0.5">
                    CID Secundário (opcional)
                  </label>
                  <input
                    type="text"
                    id="cidSecundario"
                    value={form.cidSecundario}
                    onChange={(e) => setForm({ ...form, cidSecundario: e.target.value.toUpperCase() })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Z85.3"
                    disabled={submitting}
                  />
                </div>
              </div>
            </>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-2 border-t border-gray-200">
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
                  <FileCheck size={14} />
                  Registrar Autorização
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
