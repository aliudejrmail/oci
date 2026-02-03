/**
 * Calcula a data de prazo baseado no tipo de OCI
 * Geral: 60 dias
 * Oncológico: 30 dias
 */
export function calcularDataPrazo(tipoOci: 'GERAL' | 'ONCOLOGICO', dataSolicitacao: Date = new Date()): Date {
  const dias = tipoOci === 'ONCOLOGICO' ? 30 : 60;
  const prazo = new Date(dataSolicitacao);
  prazo.setDate(prazo.getDate() + dias);
  return prazo;
}

/**
 * Calcula dias restantes até o prazo
 */
export function calcularDiasRestantes(dataPrazo: Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazo = new Date(dataPrazo);
  prazo.setHours(0, 0, 0, 0);
  
  const diffTime = prazo.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Prazo para registro do resultado de biópsia – OCI GERAL: 30 dias a partir da data de coleta.
 * (Oncológica usa calcularPrazoResultadoBiopsiaOncologico com data da consulta.)
 */
export function calcularPrazoResultadoBiopsia(_tipoOci: 'GERAL' | 'ONCOLOGICO', dataColeta: Date): Date {
  const dias = 30; // Geral: 30 dias da coleta
  const prazo = new Date(dataColeta);
  prazo.setDate(prazo.getDate() + dias);
  return prazo;
}

/**
 * Prazo para registro do resultado de biópsia – OCI ONCOLÓGICA: 30 dias corridos a partir do
 * registro da consulta médica especializada (1º procedimento). O faturamento APAC inicia a partir dessa data.
 * Ex.: consulta 01/01 → prazo resultado 31/01; consulta 15/02 → prazo resultado 17/03.
 */
export function calcularPrazoResultadoBiopsiaOncologico(dataConsultaEspecializada: Date): Date {
  const prazo = new Date(dataConsultaEspecializada);
  prazo.setDate(prazo.getDate() + 30);
  return prazo;
}

/**
 * Determina o nível de alerta baseado nos dias restantes
 */
export function determinarNivelAlerta(diasRestantes: number, tipoOci: 'GERAL' | 'ONCOLOGICO'): 'INFO' | 'ATENCAO' | 'CRITICO' {
  const limiteCritico = tipoOci === 'ONCOLOGICO' ? 5 : 10;
  const limiteAtencao = tipoOci === 'ONCOLOGICO' ? 10 : 20;

  if (diasRestantes < 0) {
    return 'CRITICO'; // Vencido
  }
  if (diasRestantes <= limiteCritico) {
    return 'CRITICO';
  }
  if (diasRestantes <= limiteAtencao) {
    return 'ATENCAO';
  }
  return 'INFO';
}

/**
 * Formata data para exibição
 */
export function formatarData(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formata data e hora para exibição
 */
export function formatarDataHora(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Retorna competência no formato YYYYMM a partir de uma data.
 * Ex.: 15/01/2026 → "202601"
 *
 * Usa extração direta de YYYY-MM quando possível para evitar problemas de timezone.
 * Ex.: "2025-12-01" ou "2025-12-01T00:00:00.000Z" → "202512" (dezembro)
 * Sem isso, new Date("2025-12-01") em UTC seria 30/11 21h no Brasil, gerando competência errada.
 */
export function competenciaDeData(data: Date | string): string {
  if (typeof data === 'string') {
    const match = data.match(/^(\d{4})-(\d{2})/);
    if (match) return `${match[1]}${match[2]}`;
  }
  const d = typeof data === 'string' ? new Date(data) : data;
  // Para Date: usar componentes locais (ano, mês) - assume que Date foi criado corretamente
  // com new Date(ano, mes-1, dia) no timezone local
  const ano = d.getFullYear();
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${ano}${mes}`;
}

/**
 * Retorna competência (YYYYMM) a partir de uma Date usando componentes UTC.
 * Útil para comparar com competência do primeiro procedimento quando a data vem do banco em UTC.
 */
export function competenciaDeDataUTC(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = (data.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${ano}${mes}`;
}

/**
 * Retorna a competência do mês seguinte.
 * Ex.: "202601" → "202602"
 */
export function proximaCompetencia(competencia: string): string {
  const ano = parseInt(competencia.slice(0, 4), 10);
  const mes = parseInt(competencia.slice(4, 6), 10);
  if (mes === 12) return `${ano + 1}01`;
  return `${ano}${(mes + 1).toString().padStart(2, '0')}`;
}

/**
 * Retorna a data do último dia do mês da competência (fim da competência).
 * Ex.: "202602" → Date(2026-02-28) (último dia de fevereiro)
 *
 * Regra Portarias MS: Qualquer procedimento registrado no mês da 1ª competência
 * (ex.: 04/12 ou 20/12) resulta na mesma competência de apresentação e mesma
 * data limite (31/01) - último dia da competência de apresentação.
 *
 * Nota: JavaScript Date usa índice de mês 0-11 (0 = janeiro, 11 = dezembro).
 */
export function dataFimCompetencia(competencia: string): Date {
  const ano = parseInt(competencia.slice(0, 4), 10);
  const mes = parseInt(competencia.slice(4, 6), 10); // 1-12 (número do mês)
  // Converter para índice JavaScript (0-11) e usar o mês seguinte para obter o último dia
  // Ex.: mes=2 (fevereiro) → mesIndex=1 → new Date(ano, 2, 0) = último dia de fevereiro
  const mesIndex = mes - 1; // Converter 1-12 para 0-11
  const dataFim = new Date(ano, mesIndex + 1, 0); // Último dia do mês especificado
  dataFim.setHours(23, 59, 59, 999); // Fim do dia
  return dataFim;
}

/**
 * Calcula o quinto dia útil do mês seguinte a uma competência.
 * Ex.: competência 202602 (fevereiro) → quinto dia útil de março
 * 
 * Regra: Prazo de apresentação no SIA/SUS é até o 5º dia útil do mês seguinte
 * ao fim da competência
 */
export function calcularDecimoDiaUtilMesSeguinte(competencia: string): Date {
  const ano = parseInt(competencia.slice(0, 4), 10);
  const mes = parseInt(competencia.slice(4, 6), 10); // 1-12
  
  // Calcular mês seguinte
  let mesSeguinte = mes + 1;
  let anoSeguinte = ano;
  if (mesSeguinte > 12) {
    mesSeguinte = 1;
    anoSeguinte = ano + 1;
  }
  
  // Começar do dia 1 do mês seguinte
  let dia = 1;
  let diasUteis = 0;
  const data = new Date(anoSeguinte, mesSeguinte - 1, dia);
  
  // Contar dias úteis até chegar ao quinto
  // Dias úteis: segunda (1) a sexta (5)
  while (diasUteis < 5) {
    const diaSemana = data.getDay(); // 0 = domingo, 6 = sábado
    // Considerar apenas segunda a sexta (1-5) como dias úteis
    // Nota: Em produção, seria necessário considerar feriados nacionais
    if (diaSemana >= 1 && diaSemana <= 5) {
      diasUteis++;
      if (diasUteis === 5) {
        break;
      }
    }
    // Avançar para o próximo dia
    dia++;
    data.setDate(dia);
  }
  
  // Garantir que a hora está no início do dia
  data.setHours(0, 0, 0, 0);
  
  return data;
}

/**
 * Para OCIs oncológicas: data limite para registro dos procedimentos é o MENOR entre
 * (1) 30 dias corridos a partir da consulta médica especializada (primeiro procedimento) e
 * (2) último dia da segunda competência.
 * O primeiro critério são os 30 dias; considera-se também o prazo de duas competências.
 * Usa componentes UTC para evitar deslocamento de timezone (ex.: 01/01/2026 + 30 dias = 31/01/2026).
 */
export function dataLimiteRegistroOncologico(
  dataConsultaEspecializada: Date,
  competenciaFimApac: string
): Date {
  const y = dataConsultaEspecializada.getUTCFullYear();
  const m = dataConsultaEspecializada.getUTCMonth();
  const d = dataConsultaEspecializada.getUTCDate();
  const trintaDiasDepois = new Date(Date.UTC(y, m, d + 30, 23, 59, 59, 999));
  const fimSegundaCompetencia = dataFimCompetencia(competenciaFimApac);
  return trintaDiasDepois <= fimSegundaCompetencia ? trintaDiasDepois : fimSegundaCompetencia;
}

/**
 * Calcula dias restantes até o prazo de apresentação da competência APAC.
 * O prazo é até o 5º dia útil do mês seguinte ao fim da competência.
 * Retorna negativo se já passou.
 */
export function calcularDiasRestantesCompetenciaApac(competenciaFimApac: string | null): number | null {
  if (!competenciaFimApac) return null;
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  // Calcular o quinto dia útil do mês seguinte ao fim da competência
  const prazoApresentacao = calcularDecimoDiaUtilMesSeguinte(competenciaFimApac);
  prazoApresentacao.setHours(0, 0, 0, 0);
  
  const diffTime = prazoApresentacao.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}
