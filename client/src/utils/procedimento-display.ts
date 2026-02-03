/**
 * Utilitários para exibição de status de procedimentos.
 * Regra: quando há procedimentos consulta/teleconsulta mutuamente exclusivos,
 * se um for executado, o outro deve exibir como DISPENSADO (portarias MS).
 */

export interface ExecucaoParaDisplay {
  id: string
  status: string
  procedimento: { id: string; nome: string }
}

/** Indica se o procedimento é do tipo consulta ou teleconsulta (por nome). */
export function isProcedimentoConsultaOuTeleconsulta(nome: string): boolean {
  const n = (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return n.includes('consulta') || n.includes('teleconsulta')
}

/**
 * Indica se o procedimento é ANATOMO-PATOLÓGICO (por nome).
 * Procedimentos anatomo-patológicos obrigatórios exigem data de coleta e data de resultado.
 */
export function isProcedimentoAnatomoPatologico(nome: string): boolean {
  const n = (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return n.includes('anatomo') && n.includes('patol')
}

/**
 * Consulta médica especializada (presencial ou teleconsulta): nome contém "consulta" e "especializada".
 * Alinhado com o backend para regra de mutual exclusividade (DISPENSADO).
 */
export function isConsultaMedicaEspecializada(nome: string): boolean {
  const n = (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return n.includes('consulta') && n.includes('especializada')
}

/**
 * Retorna o status para exibição na UI.
 * Quando um procedimento consulta/teleconsulta ESPECIALIZADA está REALIZADO e outro do mesmo grupo
 * está PENDENTE ou AGENDADO, o não executado exibe como DISPENSADO.
 * Usa isConsultaMedicaEspecializada para alinhar com a regra do backend.
 */
export function getStatusExibicao(
  execucao: ExecucaoParaDisplay,
  todasExecucoes: ExecucaoParaDisplay[]
): string {
  if (execucao.status === 'REALIZADO' || execucao.status === 'CANCELADO' || execucao.status === 'DISPENSADO') {
    return execucao.status
  }

  if (isConsultaMedicaEspecializada(execucao.procedimento.nome)) {
    const outroNoGrupoExecutado = todasExecucoes.some(
      (e) =>
        e.id !== execucao.id &&
        isConsultaMedicaEspecializada(e.procedimento.nome) &&
        e.status === 'REALIZADO'
    )
    if (outroNoGrupoExecutado) return 'DISPENSADO'
  }

  return execucao.status
}
