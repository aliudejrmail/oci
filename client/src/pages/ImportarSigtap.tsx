import { useState, useRef } from 'react'
import { api } from '../services/api'
import { Upload, FileArchive, AlertCircle, CheckCircle } from 'lucide-react'

export default function ImportarSigtap() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<{ sucesso: boolean; message: string; log?: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setArquivo(file || null)
    setResultado(null)
    setErro(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!arquivo) {
      setErro('Selecione um arquivo .zip da tabela SIGTAP (por competência).')
      return
    }
    if (!arquivo.name.toLowerCase().endsWith('.zip')) {
      setErro('O arquivo deve ser .zip (tabela compacta do SIGTAP).')
      return
    }
    setErro(null)
    setResultado(null)
    setImportando(true)
    try {
      const formData = new FormData()
      formData.append('arquivo', arquivo)
      const res = await api.post('/sigtap/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000
      })
      setResultado({
        sucesso: true,
        message: res.data?.message ?? 'Importação concluída.',
        log: res.data?.log
      })
      setArquivo(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; log?: string } } })?.response?.data
      setResultado({
        sucesso: false,
        message: data?.message ?? 'Falha na importação.',
        log: data?.log
      })
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-50 rounded-lg">
          <FileArchive className="text-primary-600" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Importar tabela SIGTAP</h1>
          <p className="text-sm text-gray-500">
            Atualize procedimentos e compatibilidades (CID/CBO) a partir do arquivo compactado da competência.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-amber-800">
          <p className="font-medium mb-1">Como obter o arquivo</p>
          <p>
            Baixe a tabela unificada do SIGTAP por competência em{' '}
            <a
              href="http://sigtap.datasus.gov.br/tabela-unificada/app/download.jsp"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              sigtap.datasus.gov.br (Download)
            </a>
            . Após o download, descompacte localmente se quiser conferir ou envie o arquivo .zip diretamente abaixo.
            O sistema irá extrair o ZIP, importar <strong>tb_procedimento</strong> (procedimentos_sigtap) e as
            compatibilidades <strong>CID/CBO</strong> dos procedimentos de OCI.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arquivo .zip da tabela SIGTAP (por competência)
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={handleFileChange}
                disabled={importando}
                className="block w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 file:cursor-pointer disabled:opacity-50"
              />
            </div>
            {arquivo && (
              <p className="mt-1 text-xs text-gray-600">
                Selecionado: {arquivo.name} ({(arquivo.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {erro && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-800">
              {erro}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={importando || !arquivo}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {importando ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Importando... (pode levar alguns minutos)
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Importar
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {resultado && (
        <div
          className={`rounded-lg border p-4 ${
            resultado.sucesso ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {resultado.sucesso ? (
              <CheckCircle className="text-green-600" size={20} />
            ) : (
              <AlertCircle className="text-red-600" size={20} />
            )}
            <span className={`font-medium ${resultado.sucesso ? 'text-green-800' : 'text-red-800'}`}>
              {resultado.message}
            </span>
          </div>
          {resultado.log && (
            <pre className="mt-2 p-3 bg-white/80 rounded text-xs overflow-auto max-h-64 border border-gray-200 whitespace-pre-wrap">
              {resultado.log}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
