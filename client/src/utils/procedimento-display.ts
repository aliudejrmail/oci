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
 * Retorna o status para exibição na UI.
 * Quando um procedimento consulta/teleconsulta está EXECUTADO e outro do mesmo grupo
 * está PENDENTE ou AGENDADO, o não executado exibe como DISPENSADO.
 */
export function getStatusExibicao(
  execucao: ExecucaoParaDisplay,
  todasExecucoes: ExecucaoParaDisplay[]
): string {
  if (execucao.status === 'EXECUTADO' || execucao.status === 'CANCELADO' || execucao.status === 'DISPENSADO') {
    return execucao.status
  }

  if (isProcedimentoConsultaOuTeleconsulta(execucao.procedimento.nome)) {
    const outroNoGrupoExecutado = todasExecucoes.some(
      (e) =>
        e.id !== execucao.id &&
        isProcedimentoConsultaOuTeleconsulta(e.procedimento.nome) &&
        e.status === 'EXECUTADO'
    )
    if (outroNoGrupoExecutado) return 'DISPENSADO'
  }

  return execucao.status
}
