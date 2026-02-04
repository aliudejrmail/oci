/**
 * Utilitários para formatação de data/hora no padrão brasileiro.
 * - Data: dd/MM/yyyy
 * - Hora: HH:mm (24h)
 * - Data e hora: dd/MM/yyyy HH:mm
 */
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const LOCALE = ptBR

/** Formata apenas data: dd/MM/yyyy */
export function formatarData(data: Date | string | null | undefined): string {
  if (!data) return ''
  const d = typeof data === 'string' ? new Date(data) : data
  if (isNaN(d.getTime())) return ''
  return format(d, 'dd/MM/yyyy', { locale: LOCALE })
}

/** Formata data e hora: dd/MM/yyyy HH:mm */
export function formatarDataHora(data: Date | string | null | undefined): string {
  if (!data) return ''
  const d = typeof data === 'string' ? new Date(data) : data
  if (isNaN(d.getTime())) return ''
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: LOCALE })
}

/** Formata data e hora compacto: dd/MM/yyyy HH:mm (sem "às") */
export function formatarDataHoraCompacto(data: Date | string | null | undefined): string {
  if (!data) return ''
  const d = typeof data === 'string' ? new Date(data) : data
  if (isNaN(d.getTime())) return ''
  return format(d, 'dd/MM/yyyy HH:mm', { locale: LOCALE })
}

/**
 * Formata data sem problemas de timezone (para strings ISO).
 * Usa apenas a parte da data (YYYY-MM-DD) para evitar deslocamento.
 */
export function formatarDataSemTimezone(dataString: string | Date | null | undefined): string {
  if (!dataString) return ''
  if (dataString instanceof Date) {
    const ano = dataString.getFullYear()
    const mes = (dataString.getMonth() + 1).toString().padStart(2, '0')
    const dia = dataString.getDate().toString().padStart(2, '0')
    return `${dia}/${mes}/${ano}`
  }
  const dataStr = dataString.toString()
  const partesData = dataStr.split('T')[0].split('-')
  if (partesData.length === 3) {
    const [ano, mesStr, dia] = partesData
    const mes = parseInt(mesStr, 10) - 1
    return format(new Date(parseInt(ano, 10), mes, parseInt(dia, 10)), 'dd/MM/yyyy', { locale: LOCALE })
  }
  try {
    const parsed = parseISO(dataStr)
    return format(parsed, 'dd/MM/yyyy', { locale: LOCALE })
  } catch {
    return format(new Date(dataStr), 'dd/MM/yyyy', { locale: LOCALE })
  }
}
