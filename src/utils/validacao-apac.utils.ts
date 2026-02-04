import { STATUS_EXECUCAO } from '../constants/status-execucao';

/**
 * Valida o formato do número de autorização APAC conforme manual PMAE/OCI
 * Portaria SAES/MS nº 1640/2024, Art. 12: "As APACs para registro das OCIs deverão ser registradas 
 * com o quinto dígito "7", específico do PMAE, e com caráter de atendimento eletivo."
 * 
 * Formato esperado: 13 dígitos, onde o 5º dígito deve ser "7"
 * Exemplo válido: 1234712345678
 */
export function validarNumeroAutorizacaoApac(numero: string): { valido: boolean; erro?: string } {
  if (!numero || typeof numero !== 'string') {
    return { valido: false, erro: 'O número de autorização APAC é obrigatório.' };
  }

  // Remover espaços e caracteres especiais
  const numeroLimpo = numero.replace(/\D/g, '');

  // Validar comprimento (13 dígitos)
  if (numeroLimpo.length !== 13) {
    return {
      valido: false,
      erro: `O número de autorização APAC deve conter exatamente 13 dígitos. Fornecido: ${numeroLimpo.length} dígito(s).`
    };
  }

  // Validar que todos os caracteres são dígitos
  if (!/^\d{13}$/.test(numeroLimpo)) {
    return {
      valido: false,
      erro: 'O número de autorização APAC deve conter apenas dígitos numéricos.'
    };
  }

  // Validar que o 5º dígito (índice 4) é "7" conforme Portaria SAES/MS nº 1640/2024
  const quintoDigito = numeroLimpo.charAt(4);
  if (quintoDigito !== '7') {
    return {
      valido: false,
      erro: `O 5º dígito do número de autorização APAC deve ser "7" (sete), conforme Portaria SAES/MS nº 1640/2024. Valor encontrado: "${quintoDigito}".`
    };
  }

  return { valido: true };
}

/**
 * Formata o número de autorização APAC para exibição
 * Formato: XXXX7-XXXXXXX (com hífen após o 5º dígito)
 */
export function formatarNumeroAutorizacaoApac(numero: string): string {
  if (!numero) return '';
  
  const numeroLimpo = numero.replace(/\D/g, '');
  
  if (numeroLimpo.length === 13) {
    return `${numeroLimpo.substring(0, 4)}${numeroLimpo.charAt(4)}-${numeroLimpo.substring(5)}`;
  }
  
  return numero;
}

/**
 * Valida o motivo de saída da APAC conforme Manual PMAE/OCI
 * Motivos permitidos: 1.1, 1.2, 1.4, 1.5, 4.1, 4.2, 4.3
 */
export function validarMotivoSaida(motivo: string | null | undefined): { valido: boolean; erro?: string } {
  if (!motivo) {
    return { valido: false, erro: 'O motivo de saída é obrigatório quando a APAC é encerrada.' };
  }

  const motivosPermitidos = ['1.1', '1.2', '1.4', '1.5', '4.1', '4.2', '4.3'];
  
  if (!motivosPermitidos.includes(motivo)) {
    return {
      valido: false,
      erro: `Motivo de saída inválido. Motivos permitidos: ${motivosPermitidos.join(', ')}. Valor fornecido: "${motivo}".`
    };
  }

  return { valido: true };
}

/**
 * Indica se o procedimento é ANATOMO-PATOLÓGICO (por nome).
 * Ex.: "EXAME ANATOMO-PATOLÓGICO DO COLO UTERINO", "EXAME ANATOMO PATOLÓGICO PARA CONGELAMENTO"
 */
export function isProcedimentoAnatomoPatologico(nome: string): boolean {
  const n = (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return n.includes('anatomo') && n.includes('patol');
}

/**
 * Indica se o procedimento é do tipo consulta ou teleconsulta (por nome).
 * Usado para regra: OCIs com duas consultas obrigatórias (uma consulta e uma teleconsulta)
 * exigem apenas que uma delas seja registrada como realizada (portarias MS).
 */
export function isProcedimentoConsultaOuTeleconsulta(nome: string): boolean {
  const n = (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return n.includes('consulta') || n.includes('teleconsulta');
}

export interface ProcedimentoObrigatorio {
  id: string;
  codigo: string;
  nome: string;
}

export interface ExecucaoParaValidacao {
  status: string;
  procedimento: { id: string; codigo: string; nome: string };
}

/**
 * Valida se os procedimentos obrigatórios da OCI foram satisfeitos.
 * Regra especial: quando há 2+ procedimentos obrigatórios do tipo consulta/teleconsulta,
 * basta que apenas um deles seja registrado como realizado (portarias MS).
 * Demais procedimentos obrigatórios precisam estar todos executados.
 * Retorna mensagem com TODOS os obrigatórios pendentes (não apenas o primeiro).
 */
export function validarProcedimentosObrigatoriosOci(
  procedimentosObrigatorios: ProcedimentoObrigatorio[],
  execucoes: ExecucaoParaValidacao[]
): { valido: boolean; erro?: string } {
  // Considerar REALIZADO e AGUARDANDO_RESULTADO como válidos para anatomo-patológicos
  const execucoesValidas = execucoes.filter((e) => {
    if (e.status === STATUS_EXECUCAO.REALIZADO) return true;
    // AGUARDANDO_RESULTADO também é considerado válido para anatomo-patológicos
    if (e.status === STATUS_EXECUCAO.AGUARDANDO_RESULTADO && 
        isProcedimentoAnatomoPatologico(e.procedimento.nome)) {
      return true;
    }
    return false;
  });
  
  const idsExecutados = new Set(execucoesValidas.map((e) => e.procedimento.id));

  const grupoConsulta = procedimentosObrigatorios.filter((p) =>
    isProcedimentoConsultaOuTeleconsulta(p.nome)
  );
  const outrosObrigatorios = procedimentosObrigatorios.filter(
    (p) => !isProcedimentoConsultaOuTeleconsulta(p.nome)
  );

  const pendentes: string[] = [];

  // Grupo consulta/teleconsulta: pelo menos um executado
  if (grupoConsulta.length > 0) {
    const algumConsultaExecutado = grupoConsulta.some((p) => idsExecutados.has(p.id));
    if (!algumConsultaExecutado) {
      const nomes = grupoConsulta.map((p) => p.nome).join(' ou ');
      pendentes.push(`Pelo menos uma das consultas deve ser registrada: ${nomes}`);
    }
  }

  // Outros obrigatórios: todos executados
  for (const p of outrosObrigatorios) {
    if (!idsExecutados.has(p.id)) {
      pendentes.push(`${p.nome} (${p.codigo})`);
    }
  }

  if (pendentes.length === 0) {
    return { valido: true };
  }

  return {
    valido: false,
    erro:
      'Não é possível marcar como concluída. Procedimentos obrigatórios ainda não registrados como realizados:\n\n' +
      pendentes.map((texto) => `• ${texto}`).join('\n')
  };
}

/**
 * Verifica se todos os obrigatórios da OCI estão satisfeitos (para conclusão da solicitação).
 * Grupo consulta/teleconsulta: pelo menos um executado; demais obrigatórios: todos executados.
 */
export function obrigatoriosSatisfeitos(
  procedimentosObrigatorios: ProcedimentoObrigatorio[],
  execucoes: ExecucaoParaValidacao[]
): boolean {
  const resultado = validarProcedimentosObrigatoriosOci(procedimentosObrigatorios, execucoes);
  return resultado.valido;
}

/**
 * Valida se há pelo menos 2 procedimentos secundários executados,
 * sendo um deles obrigatoriamente "03.01.01.007-2" ou "03.01.01.030-7"
 * @deprecated Preferir validarProcedimentosObrigatoriosOci com procedimentos da OCI (obrigatorio + nome).
 */
export function validarProcedimentosSecundariosObrigatorios(
  execucoes: Array<{ status: string; procedimento: { codigo: string } }>
): { valido: boolean; erro?: string } {
  const execucoesRealizadas = execucoes.filter((e) => e.status === STATUS_EXECUCAO.REALIZADO);

  if (execucoesRealizadas.length < 2) {
    return {
      valido: false,
      erro: `É obrigatório executar no mínimo 2 procedimentos secundários. Executados: ${execucoesRealizadas.length}.`
    };
  }

  const codigosObrigatorios = ['03.01.01.007-2', '03.01.01.030-7'];
  const temProcedimentoObrigatorio = execucoesRealizadas.some((e) =>
    codigosObrigatorios.includes(e.procedimento.codigo)
  );

  if (!temProcedimentoObrigatorio) {
    return {
      valido: false,
      erro: `É obrigatório executar pelo menos um dos seguintes procedimentos: ${codigosObrigatorios.join(' ou ')}.`
    };
  }

  return { valido: true };
}
