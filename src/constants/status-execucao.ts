/**
 * Códigos de status de execução de procedimento.
 * Alinhados com a tabela auxiliar status_execucao no banco.
 * Use estas constantes em vez de strings literais para garantir consistência.
 */
export const STATUS_EXECUCAO = {
  PENDENTE: 'PENDENTE',
  AGENDADO: 'AGENDADO',
  REALIZADO: 'REALIZADO',
  CANCELADO: 'CANCELADO',
  DISPENSADO: 'DISPENSADO',
} as const

export type StatusExecucaoCodigo = (typeof STATUS_EXECUCAO)[keyof typeof STATUS_EXECUCAO]
