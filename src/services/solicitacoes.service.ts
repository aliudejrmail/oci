import { PrismaClient, StatusSolicitacao, TipoOci } from '@prisma/client';
import { calcularDataPrazo, calcularDiasRestantes, competenciaDeData, competenciaDeDataUTC, determinarNivelAlerta, proximaCompetencia, calcularDecimoDiaUtilMesSeguinte, dataFimCompetencia, dataLimiteRegistroOncologico } from '../utils/date.utils';
import { gerarNumeroProtocolo } from '../utils/gerador-protocolo.utils';
import {
  validarMotivoSaida,
  validarProcedimentosObrigatoriosOci,
  obrigatoriosSatisfeitos,
  type ProcedimentoObrigatorio,
  type ExecucaoParaValidacao
} from '../utils/validacao-apac.utils';

/** Procedimentos de biópsia só podem ser EXECUTADO após registro do resultado (nome contém "biópsia" ou "biopsia"). */
function isProcedimentoBiopsia(nome: string): boolean {
  const n = (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove todos os acentos (ó -> o)
  return n.includes('biopsia');
}

/** Consulta médica especializada (presencial ou teleconsulta): nome contém "consulta" e "especializada". */
function isConsultaMedicaEspecializada(nome: string): boolean {
  const n = (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return n.includes('consulta') && n.includes('especializada');
}

export class SolicitacoesService {
  constructor(private prisma: PrismaClient) {
    if (!prisma) {
      throw new Error('PrismaClient não foi fornecido ao SolicitacoesService');
    }
  }

  async criarSolicitacao(data: {
    pacienteId: string;
    ociId: string;
    observacoes?: string;
    unidadeOrigem: string;
    unidadeDestino?: string;
    criadoPorId: string;
  }) {
    // Buscar OCI para obter tipo e prazo
    const oci = await this.prisma.oci.findUnique({
      where: { id: data.ociId },
      include: { procedimentos: { orderBy: { ordem: 'asc' } } }
    });

    if (!oci) {
      throw new Error('OCI não encontrada');
    }

    const procedimentosSigtap = oci.procedimentos.filter((p) => p.codigoSigtap != null);
    if (procedimentosSigtap.length === 0) {
      throw new Error(
        'Esta OCI não possui procedimentos da tabela SIGTAP. Utilize apenas OCIs importadas da tabela SIGTAP (npm run importar:ocis-sigtap).'
      );
    }

    // Gerar protocolo
    const numeroProtocolo = await gerarNumeroProtocolo(this.prisma);

    // Calcular data de prazo
    const dataSolicitacao = new Date();
    const dataPrazo = calcularDataPrazo(oci.tipo, dataSolicitacao);

    // APAC: validade 2 competências (Portaria SAES 1640/1821)
    // Inicialmente, as competências serão calculadas quando o primeiro procedimento for executado
    // A data base inicial é a data do primeiro procedimento realizado (Art. 15, §1º)
    const competenciaInicioApac = null; // Será calculado quando o primeiro procedimento for executado
    const competenciaFimApac = null; // Será calculado quando o primeiro procedimento for executado

    // Criar solicitação
    // tipoApac = "3" (APAC Única, não admite continuidade) conforme Manual PMAE/OCI
    const solicitacao = await this.prisma.solicitacaoOci.create({
      data: {
        numeroProtocolo,
        pacienteId: data.pacienteId,
        ociId: data.ociId,
        tipo: oci.tipo,
        dataSolicitacao,
        dataPrazo,
        competenciaInicioApac,
        competenciaFimApac,
        tipoApac: '3', // APAC Única conforme Manual PMAE/OCI
        observacoes: data.observacoes,
        unidadeOrigem: data.unidadeOrigem,
        unidadeDestino: data.unidadeDestino,
        criadoPorId: data.criadoPorId,
        status: StatusSolicitacao.PENDENTE
      }
    });

    // Criar execuções apenas para procedimentos da tabela SIGTAP (codigoSigtap preenchido)
    if (procedimentosSigtap.length > 0) {
      await this.prisma.execucaoProcedimento.createMany({
        data: procedimentosSigtap.map((proc) => ({
          solicitacaoId: solicitacao.id,
          procedimentoId: proc.id,
          status: 'PENDENTE'
        }))
      });
    }

    // Criar alerta inicial
    const diasRestantes = calcularDiasRestantes(dataPrazo);
    await this.prisma.alertaPrazo.create({
      data: {
        solicitacaoId: solicitacao.id,
        diasRestantes,
        nivelAlerta: determinarNivelAlerta(diasRestantes, oci.tipo)
      }
    });

    return await this.buscarSolicitacaoPorId(solicitacao.id);
  }

  async buscarSolicitacaoPorId(id: string) {
    const solicitacao = await this.prisma.solicitacaoOci.findUnique({
      where: { id },
      include: {
        paciente: true,
        oci: {
          include: {
            procedimentos: {
              orderBy: { ordem: 'asc' }
            }
          }
        },
        execucoes: {
          include: {
            procedimento: true
          },
          orderBy: {
            procedimento: {
              ordem: 'asc'
            }
          }
        },
        criadoPor: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        atualizadoPor: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        alerta: true,
        anexos: {
          orderBy: { createdAt: 'desc' }
        },
        medicoSolicitante: {
          select: {
            id: true,
            nome: true,
            cns: true
          }
        }
      }
    });

    if (!solicitacao || solicitacao.deletedAt) {
      return null;
    }

    // Adicionar prazos APAC quando houver competências (2 competências - Portaria 1640/2024)
    // Oncológico: primeiro critério 30 dias desde a consulta; considera-se também 2 competências
    // diasRestantes SEMPRE em relação ao REGISTRO de procedimentos (dataFimValidadeApac), nunca à apresentação APAC
    if (solicitacao && solicitacao.competenciaFimApac) {
      try {
        const prazoApresentacaoApac = calcularDecimoDiaUtilMesSeguinte(solicitacao.competenciaFimApac);
        const tipoOci = solicitacao.oci?.tipo ?? solicitacao.tipo;
        const dataFimValidadeApac = (tipoOci === 'ONCOLOGICO' && solicitacao.dataInicioValidadeApac)
          ? dataLimiteRegistroOncologico(solicitacao.dataInicioValidadeApac, solicitacao.competenciaFimApac)
          : dataFimCompetencia(solicitacao.competenciaFimApac);
        const diasRestantesRegistro = calcularDiasRestantes(dataFimValidadeApac);
        const nivelAlertaRegistro = determinarNivelAlerta(diasRestantesRegistro, solicitacao.oci?.tipo || 'GERAL');
        const alertaEnriquecido = solicitacao.alerta
          ? { ...solicitacao.alerta, diasRestantes: diasRestantesRegistro, nivelAlerta: nivelAlertaRegistro }
          : { id: '', solicitacaoId: solicitacao.id, diasRestantes: diasRestantesRegistro, nivelAlerta: nivelAlertaRegistro, notificado: false };
        return {
          ...solicitacao,
          prazoApresentacaoApac,
          dataFimValidadeApac,
          alerta: alertaEnriquecido
        };
      } catch (error) {
        console.error(`Erro ao calcular prazo APAC para solicitação ${solicitacao.id}:`, error);
      }
    }

    return solicitacao;
  }

  async atualizarSolicitacao(id: string, data: {
    observacoes?: string | null;
    unidadeOrigem?: string;
    unidadeDestino?: string | null;
    ociId?: string;
  }) {
    // Validar campos obrigatórios
    if (data.unidadeOrigem !== undefined && !data.unidadeOrigem.trim()) {
      throw new Error('Unidade de origem é obrigatória');
    }

    const solicitacaoAtual = await this.prisma.solicitacaoOci.findUnique({
      where: { id },
      include: { execucoes: true, oci: true }
    });

    if (!solicitacaoAtual) {
      throw new Error('Solicitação não encontrada');
    }

    // Se estiver alterando a OCI, verificar se nenhum procedimento foi registrado
    if (data.ociId && data.ociId !== solicitacaoAtual.ociId) {
      const algumRegistrado = solicitacaoAtual.execucoes.some(
        (e) => e.status !== 'PENDENTE' || e.dataExecucao != null
      );
      if (algumRegistrado) {
        throw new Error(
          'Não é possível alterar a OCI pois já existe pelo menos um procedimento registrado (executado ou agendado). Cancele a solicitação e crie uma nova se necessário.'
        );
      }

      // Buscar nova OCI com procedimentos SIGTAP
      const novaOci = await this.prisma.oci.findUnique({
        where: { id: data.ociId },
        include: { procedimentos: { where: { codigoSigtap: { not: null } }, orderBy: { ordem: 'asc' } } }
      });

      if (!novaOci) {
        throw new Error('OCI não encontrada');
      }

      const procedimentosSigtap = novaOci.procedimentos.filter((p) => p.codigoSigtap != null);
      if (procedimentosSigtap.length === 0) {
        throw new Error('A OCI selecionada não possui procedimentos da tabela SIGTAP.');
      }

      // Remover execuções antigas
      await this.prisma.execucaoProcedimento.deleteMany({ where: { solicitacaoId: id } });

      // Recalcular data de prazo conforme novo tipo de OCI
      const dataSolicitacao = solicitacaoAtual.dataSolicitacao;
      const dataPrazo = calcularDataPrazo(novaOci.tipo, dataSolicitacao);
      const diasRestantes = calcularDiasRestantes(dataPrazo);
      const nivelAlerta = determinarNivelAlerta(diasRestantes, novaOci.tipo);

      // Atualizar solicitação (ociId, tipo, dataPrazo e demais campos)
      await this.prisma.solicitacaoOci.update({
        where: { id },
        data: {
          ociId: data.ociId,
          tipo: novaOci.tipo,
          dataPrazo,
          observacoes: data.observacoes ?? solicitacaoAtual.observacoes,
          unidadeOrigem: data.unidadeOrigem ?? solicitacaoAtual.unidadeOrigem,
          unidadeDestino: data.unidadeDestino !== undefined ? data.unidadeDestino : solicitacaoAtual.unidadeDestino,
          updatedAt: new Date()
        }
      });

      // Criar novas execuções para os procedimentos da nova OCI
      await this.prisma.execucaoProcedimento.createMany({
        data: procedimentosSigtap.map((proc) => ({
          solicitacaoId: id,
          procedimentoId: proc.id,
          status: 'PENDENTE'
        }))
      });

      // Atualizar ou criar alerta de prazo
      await this.prisma.alertaPrazo.upsert({
        where: { solicitacaoId: id },
        update: { diasRestantes, nivelAlerta },
        create: {
          solicitacaoId: id,
          diasRestantes,
          nivelAlerta
        }
      });
    } else {
      // Apenas atualizar campos editáveis (sem troca de OCI)
      await this.prisma.solicitacaoOci.update({
        where: { id },
        data: {
          observacoes: data.observacoes ?? solicitacaoAtual.observacoes,
          unidadeOrigem: data.unidadeOrigem ?? solicitacaoAtual.unidadeOrigem,
          unidadeDestino: data.unidadeDestino !== undefined ? data.unidadeDestino : solicitacaoAtual.unidadeDestino,
          updatedAt: new Date()
        }
      });
    }

    return await this.buscarSolicitacaoPorId(id);
  }

  async listarSolicitacoes(filtros: {
    status?: StatusSolicitacao;
    tipo?: TipoOci;
    pacienteId?: string;
    ociId?: string;
    dataInicio?: Date;
    dataFim?: Date;
    search?: string;
    page?: number;
    limit?: number;
    /** Quando informado (perfil EXECUTANTE), retorna apenas solicitações com ao menos uma execução agendada para este executante */
    executanteId?: string;
    /** Quando informado, retorna apenas solicitações que tenham ao menos uma execução AGENDADA nesta unidade executante */
    unidadeExecutora?: string;
    /** Quando informado (usuário de unidade solicitante), retorna apenas solicitações cuja unidade de origem seja esta */
    unidadeOrigem?: string;
  }) {
    try {
      const page = filtros.page || 1;
      const limit = filtros.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = { deletedAt: null };

      // Filtro por execuções: executante (perfil EXECUTANTE) e/ou unidade executante (agendamentos na unidade)
      const execucoesFilter: any = {};
      if (filtros.executanteId) {
        // Se o executante tem unidade vinculada, filtra por agendamentos naquela unidade; senão por executanteId
        const usuarioExecutante = await this.prisma.usuario.findUnique({
          where: { id: filtros.executanteId },
          select: { unidadeExecutanteId: true, unidadeExecutante: { select: { cnes: true, nome: true } } }
        });
        if (usuarioExecutante?.unidadeExecutanteId && usuarioExecutante.unidadeExecutante) {
          const u = usuarioExecutante.unidadeExecutante;
          execucoesFilter.status = 'AGENDADO';
          execucoesFilter.unidadeExecutora = `${u.cnes} - ${u.nome}`;
        } else {
          execucoesFilter.executanteId = filtros.executanteId;
        }
      }
      if (filtros.unidadeExecutora && filtros.unidadeExecutora.trim()) {
        execucoesFilter.status = 'AGENDADO';
        execucoesFilter.unidadeExecutora = filtros.unidadeExecutora.trim();
      }
      if (Object.keys(execucoesFilter).length > 0) {
        where.execucoes = { some: execucoesFilter };
      }

      // Usuário de unidade solicitante: só vê solicitações realizadas pela sua unidade
      if (filtros.unidadeOrigem && filtros.unidadeOrigem.trim()) {
        where.unidadeOrigem = filtros.unidadeOrigem.trim();
      }

      if (filtros.status) {
        // Garantir que o status seja um valor válido do enum
        const statusValido = Object.values(StatusSolicitacao).includes(filtros.status as StatusSolicitacao);
        if (statusValido) {
          where.status = filtros.status as StatusSolicitacao;
        } else {
          console.warn(`⚠️ Status inválido recebido: ${filtros.status}`);
        }
      }
      if (filtros.tipo) where.tipo = filtros.tipo;
      if (filtros.pacienteId) where.pacienteId = filtros.pacienteId;
      if (filtros.ociId) where.ociId = filtros.ociId;
      if (filtros.dataInicio || filtros.dataFim) {
        where.dataSolicitacao = {};
        if (filtros.dataInicio) where.dataSolicitacao.gte = filtros.dataInicio;
        if (filtros.dataFim) where.dataSolicitacao.lte = filtros.dataFim;
      }
      if (filtros.search) {
        where.OR = [
          { numeroProtocolo: { contains: filtros.search, mode: 'insensitive' } },
          { paciente: { nome: { contains: filtros.search, mode: 'insensitive' } } },
          { paciente: { cpf: { contains: filtros.search } } }
        ];
      }

      const [solicitacoes, total] = await Promise.all([
        this.prisma.solicitacaoOci.findMany({
          where,
          include: {
            paciente: {
              select: {
                id: true,
                nome: true,
                cpf: true
              }
            },
            oci: {
              select: {
                id: true,
                codigo: true,
                nome: true,
                tipo: true
              }
            },
            alerta: true,
            medicoSolicitante: {
              select: {
                id: true,
                nome: true
              }
            }
          },
          orderBy: { dataSolicitacao: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.solicitacaoOci.count({ where })
      ]);

      // Adicionar prazos APAC calculados para cada solicitação (2 competências)
      // diasRestantes SEMPRE em relação ao REGISTRO de procedimentos (dataFimValidadeApac), nunca à apresentação APAC
      const solicitacoesComPrazoApac = solicitacoes.map((sol: any) => {
        try {
          if (sol.competenciaFimApac) {
            const prazoApresentacaoApac = calcularDecimoDiaUtilMesSeguinte(sol.competenciaFimApac);
            const tipoOci = sol.oci?.tipo ?? sol.tipo;
            const dataFimValidadeApac = (tipoOci === 'ONCOLOGICO' && sol.dataInicioValidadeApac)
              ? dataLimiteRegistroOncologico(sol.dataInicioValidadeApac, sol.competenciaFimApac)
              : dataFimCompetencia(sol.competenciaFimApac);
            const diasRestantesRegistro = calcularDiasRestantes(dataFimValidadeApac);
            const nivelAlertaRegistro = determinarNivelAlerta(diasRestantesRegistro, sol.oci?.tipo || 'GERAL');
            const alertaEnriquecido = sol.alerta
              ? { ...sol.alerta, diasRestantes: diasRestantesRegistro, nivelAlerta: nivelAlertaRegistro }
              : { id: '', solicitacaoId: sol.id, diasRestantes: diasRestantesRegistro, nivelAlerta: nivelAlertaRegistro, notificado: false };
            return {
              ...sol,
              prazoApresentacaoApac,
              dataFimValidadeApac,
              alerta: alertaEnriquecido
            };
          }
        } catch (error: any) {
          console.error(`Erro ao calcular prazo APAC para solicitação ${sol.id}:`, error?.message || error);
        }
        return sol;
      });

      // Garantir que sempre retornamos a estrutura esperada
      const resultado = {
        solicitacoes: solicitacoesComPrazoApac || [],
        paginacao: {
          page: page || 1,
          limit: limit || 20,
          total: total || 0,
          totalPages: Math.ceil((total || 0) / (limit || 20))
        }
      };

      return resultado;
    } catch (error: any) {
      console.error('❌ Erro no service listarSolicitacoes:', error);
      console.error('Stack:', error.stack);
      // Retornar estrutura vazia em caso de erro para não quebrar o frontend
      return {
        solicitacoes: [],
        paginacao: {
          page: filtros.page || 1,
          limit: filtros.limit || 20,
          total: 0,
          totalPages: 0
        }
      };
    }
  }

  async atualizarStatus(
    id: string,
    status: StatusSolicitacao,
    atualizadoPorId: string,
    justificativaCancelamento?: string
  ) {
    const solicitacao = await this.prisma.solicitacaoOci.findUnique({
      where: { id },
      include: { oci: true }
    });

    if (!solicitacao) {
      throw new Error('Solicitação não encontrada');
    }

    const dataAtualizacao: any = {
      status,
      atualizadoPorId
    };

    if (status === StatusSolicitacao.CANCELADA) {
      const justificativa = (justificativaCancelamento ?? '').trim();
      if (!justificativa) {
        throw new Error(
          'É obrigatório informar a justificativa do cancelamento (ex.: motivo da desistência ou "Prazos não puderam ser cumpridos").'
        );
      }
      dataAtualizacao.justificativaCancelamento = justificativa;
    }

    if (status === StatusSolicitacao.CONCLUIDA && !solicitacao.dataConclusao) {
      // Só efetivar "Marcar concluída" se os procedimentos obrigatórios da OCI estiverem registrados como realizados
      const ociComProcedimentos = await this.prisma.oci.findUnique({
        where: { id: solicitacao.ociId },
        include: { procedimentos: { where: { obrigatorio: true }, orderBy: { ordem: 'asc' } } }
      });

      const execucoes = await this.prisma.execucaoProcedimento.findMany({
        where: { solicitacaoId: id },
        include: { procedimento: true }
      });

      if (ociComProcedimentos && ociComProcedimentos.procedimentos.length > 0) {
        const procedimentosObrigatorios: ProcedimentoObrigatorio[] =
          ociComProcedimentos.procedimentos.map((p) => ({
            id: p.id,
            codigo: p.codigo,
            nome: p.nome
          }));
        const execucoesParaValidacao: ExecucaoParaValidacao[] = execucoes.map((e) => ({
          status: e.status,
          procedimento: {
            id: e.procedimento.id,
            codigo: e.procedimento.codigo,
            nome: e.procedimento.nome
          }
        }));
        const validacao = validarProcedimentosObrigatoriosOci(procedimentosObrigatorios, execucoesParaValidacao);
        if (!validacao.valido) {
          throw new Error(
            validacao.erro ??
            'Não é possível marcar como concluída: registre a realização dos procedimentos obrigatórios da OCI.'
          );
        }
      }

      dataAtualizacao.dataConclusao = new Date();
    }

    // Verificar se está vencida
    if (status !== StatusSolicitacao.CONCLUIDA && status !== StatusSolicitacao.CANCELADA) {
      const hoje = new Date();
      if (solicitacao.dataPrazo < hoje) {
        dataAtualizacao.status = StatusSolicitacao.VENCIDA;
      }
    }

    await this.prisma.solicitacaoOci.update({
      where: { id },
      data: dataAtualizacao
    });

    // Atualizar alerta
    await this.atualizarAlertaPrazo(id);

    return await this.buscarSolicitacaoPorId(id);
  }

  async atualizarAlertaPrazo(solicitacaoId: string) {
    const solicitacao = await this.prisma.solicitacaoOci.findUnique({
      where: { id: solicitacaoId },
      include: { oci: true }
    });

    if (!solicitacao || solicitacao.status === StatusSolicitacao.CONCLUIDA) {
      return;
    }

    // Se houver competência fim APAC, usar a data limite para REGISTRO de procedimentos
    // Oncológico: primeiro critério 30 dias corridos desde a consulta (dataInicioValidadeApac); considera-se também 2 competências
    // Geral: último dia da 2ª competência
    let diasRestantes: number;

    if (solicitacao.competenciaFimApac) {
      const tipoOci = solicitacao.oci.tipo as 'GERAL' | 'ONCOLOGICO';
      const dataFimValidadeApac = tipoOci === 'ONCOLOGICO' && solicitacao.dataInicioValidadeApac
        ? dataLimiteRegistroOncologico(solicitacao.dataInicioValidadeApac, solicitacao.competenciaFimApac)
        : dataFimCompetencia(solicitacao.competenciaFimApac);
      diasRestantes = calcularDiasRestantes(dataFimValidadeApac);
    } else {
      // Usar prazo geral da OCI
      diasRestantes = calcularDiasRestantes(solicitacao.dataPrazo);
    }

    const nivelAlerta = determinarNivelAlerta(diasRestantes, solicitacao.oci.tipo);

    await this.prisma.alertaPrazo.upsert({
      where: { solicitacaoId },
      update: {
        diasRestantes,
        nivelAlerta,
        notificado: false // Resetar notificação quando atualizar
      },
      create: {
        solicitacaoId,
        diasRestantes,
        nivelAlerta
      }
    });
  }

  async atualizarExecucaoProcedimento(
    id: string,
    data: {
      dataAgendamento?: Date | string;
      dataExecucao?: Date | string | null;
      status?: string;
      observacoes?: string;
      profissional?: string;
      unidadeExecutora?: string;
      executanteId?: string | null;
      resultadoBiopsia?: string | null;
      dataColetaMaterialBiopsia?: Date | string | null;
      dataRegistroResultadoBiopsia?: Date | string | null;
    }
  ) {
    // Buscar execução com procedimento para validar regra de biópsia
    const execucaoAtual = await this.prisma.execucaoProcedimento.findUnique({
      where: { id },
      include: { procedimento: true }
    });
    if (!execucaoAtual) {
      throw new Error('Execução não encontrada');
    }

    const ehBiopsia = isProcedimentoBiopsia(execucaoAtual.procedimento.nome);
    if (data.status === 'EXECUTADO' && ehBiopsia) {
      const resultadoInformado = (data.resultadoBiopsia ?? '').toString().trim();
      const jaTinhaResultado = Boolean(execucaoAtual.resultadoBiopsia?.trim());
      if (!resultadoInformado && !jaTinhaResultado) {
        throw new Error(
          'Procedimentos de biópsia só podem ser assinalados como realizado após o registro do resultado. Informe o resultado da biópsia antes de marcar como realizado.'
        );
      }
    }

    // Só permitir marcar outros procedimentos como EXECUTADO se a consulta médica especializada já tiver sido realizada
    const ehConsultaEspecializada = isConsultaMedicaEspecializada(execucaoAtual.procedimento.nome);
    if (data.status === 'EXECUTADO' && !ehConsultaEspecializada) {
      const solicitacaoComExecucoes = await this.prisma.solicitacaoOci.findUnique({
        where: { id: execucaoAtual.solicitacaoId },
        include: {
          execucoes: {
            include: { procedimento: true }
          }
        }
      });
      if (solicitacaoComExecucoes) {
        const consultaJaRealizada = solicitacaoComExecucoes.execucoes.some(
          (e) =>
            e.id !== id &&
            isConsultaMedicaEspecializada(e.procedimento.nome) &&
            e.status === 'EXECUTADO' &&
            e.dataExecucao != null
        );
        if (!consultaJaRealizada) {
          throw new Error(
            'O registro da consulta médica especializada deve ser realizado antes dos demais procedimentos. Registre primeiro a consulta médica (ou teleconsulta) em atenção especializada.'
          );
        }
      }
    }

    // Normalizar datas para evitar problemas de timezone
    // Garantir que datas sejam interpretadas como início do dia no timezone local
    const dataAtualizacao: any = { ...data };

    if (data.dataExecucao && typeof data.dataExecucao === 'string') {
      // Se vier como string ISO, extrair apenas a parte da data e criar Date local
      const dataStr = data.dataExecucao.split('T')[0]; // YYYY-MM-DD
      const [ano, mes, dia] = dataStr.split('-').map(Number);
      // Criar data no início do dia no timezone local
      dataAtualizacao.dataExecucao = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
    } else if (data.dataExecucao instanceof Date) {
      // Se já for Date, normalizar para início do dia
      const dataNormalizada = new Date(data.dataExecucao);
      dataNormalizada.setHours(0, 0, 0, 0);
      dataAtualizacao.dataExecucao = dataNormalizada;
    }

    // dataAgendamento: aceitar data+hora (agendamento) ou só data
    if (data.dataAgendamento && typeof data.dataAgendamento === 'string') {
      if (data.dataAgendamento.includes('T')) {
        dataAtualizacao.dataAgendamento = new Date(data.dataAgendamento);
      } else {
        const dataStr = data.dataAgendamento.split('T')[0];
        const [ano, mes, dia] = dataStr.split('-').map(Number);
        dataAtualizacao.dataAgendamento = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
      }
    } else if (data.dataAgendamento instanceof Date) {
      dataAtualizacao.dataAgendamento = new Date(data.dataAgendamento);
    }

    // Biópsia: resultado e datas (coleta de material + resultado)
    if (data.resultadoBiopsia !== undefined) {
      dataAtualizacao.resultadoBiopsia = data.resultadoBiopsia ? String(data.resultadoBiopsia).trim() : null;
    }
    if (data.dataColetaMaterialBiopsia !== undefined) {
      if (data.dataColetaMaterialBiopsia && typeof data.dataColetaMaterialBiopsia === 'string') {
        const dataStr = String(data.dataColetaMaterialBiopsia).split('T')[0];
        const [ano, mes, dia] = dataStr.split('-').map(Number);
        dataAtualizacao.dataColetaMaterialBiopsia = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
      } else if (data.dataColetaMaterialBiopsia instanceof Date) {
        dataAtualizacao.dataColetaMaterialBiopsia = data.dataColetaMaterialBiopsia;
      } else {
        dataAtualizacao.dataColetaMaterialBiopsia = null;
      }
    }
    if (data.dataRegistroResultadoBiopsia !== undefined) {
      if (data.dataRegistroResultadoBiopsia && typeof data.dataRegistroResultadoBiopsia === 'string') {
        const dataStr = String(data.dataRegistroResultadoBiopsia).split('T')[0];
        const [ano, mes, dia] = dataStr.split('-').map(Number);
        dataAtualizacao.dataRegistroResultadoBiopsia = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
      } else if (data.dataRegistroResultadoBiopsia instanceof Date) {
        dataAtualizacao.dataRegistroResultadoBiopsia = data.dataRegistroResultadoBiopsia;
      } else {
        dataAtualizacao.dataRegistroResultadoBiopsia = null;
      }
    }
    if (data.status === 'EXECUTADO' && ehBiopsia && dataAtualizacao.resultadoBiopsia && !dataAtualizacao.dataRegistroResultadoBiopsia) {
      dataAtualizacao.dataRegistroResultadoBiopsia = new Date();
    }

    // Atualizar a execução
    const execucao = await this.prisma.execucaoProcedimento.update({
      where: { id },
      data: dataAtualizacao,
      include: { solicitacao: true }
    });

    // APAC: atualizar datas de início/encerramento da validade (Portaria 1640/2024 art. 15)
    // A data base inicial é a data do primeiro procedimento registrado (menor data entre todos)
    // Recalcular sempre que uma execução é atualizada (marcada ou desmarcada)
    const sol = await this.prisma.solicitacaoOci.findUnique({
      where: { id: execucao.solicitacaoId },
      include: { execucoes: true }
    });
    if (!sol) return execucao;

    // Buscar todas as execuções executadas (status EXECUTADO e com dataExecucao não nula)
    // Após a atualização acima, a execução já está com o status e data corretos no banco
    const execucoesComData = sol.execucoes.filter(
      (e) => e.status === 'EXECUTADO' && e.dataExecucao != null
    );

    const atualizar: {
      dataInicioValidadeApac?: Date | null;
      dataEncerramentoApac?: Date | null;
      competenciaInicioApac?: string | null;
      competenciaFimApac?: string | null;
      dataConclusao?: Date;
      status?: StatusSolicitacao
    } = {};

    if (execucoesComData.length > 0) {
      // Data de início: primeira data (menor data) entre todos os procedimentos executados
      // Esta é a data base inicial da validade da APAC (Portaria SAES 1640/2024, Art. 15, §1º)
      const datasExecucao = execucoesComData.map((e) => e.dataExecucao!);
      const dataPrimeira = datasExecucao.reduce((a, b) => (a < b ? a : b));
      const dataUltima = datasExecucao.reduce((a, b) => (a > b ? a : b));

      // Sempre atualizar com a primeira data (data base inicial da APAC)
      atualizar.dataInicioValidadeApac = dataPrimeira;
      // dataEncerramentoApac = data do último procedimento (para faturamento SIA)
      atualizar.dataEncerramentoApac = dataUltima;

      // Calcular competências APAC baseado na data do primeiro procedimento
      // Validade: 2 competências a partir da competência do primeiro procedimento
      // Manual PMAE/OCI / Portarias MS: "o intervalo entre a data de início e de fim da validade da APAC,
      // necessariamente, estar enquadrado dentro de duas competências"
      // Ex.: 04/12 ou 20/12 → 1ª comp. 12/2025, competência de apresentação 01/2026, data limite 31/01/2026
      // Usar YYYY-MM-DD explícito para evitar problemas de timezone (competenciaDeData com string)
      const anoP = dataPrimeira.getFullYear();
      const mesP = (dataPrimeira.getMonth() + 1).toString().padStart(2, '0');
      const diaP = dataPrimeira.getDate().toString().padStart(2, '0');
      const dataPrimeiraStr = `${anoP}-${mesP}-${diaP}`;
      const competenciaPrimeiroProcedimento = competenciaDeData(dataPrimeiraStr);
      atualizar.competenciaInicioApac = competenciaPrimeiroProcedimento;
      const tipoOci = sol.tipo as 'GERAL' | 'ONCOLOGICO';
      // Oncológico: quando o prazo de 30 dias cai no mesmo mês da consulta, competência de apresentação = mesma competência (todos os procedimentos no mesmo mês)
      // Geral: sempre 2 competências (1ª = mês do 1º proc., 2ª = mês seguinte)
      let competenciaFim: string;
      if (tipoOci === 'ONCOLOGICO') {
        const competenciaFimAux = proximaCompetencia(competenciaPrimeiroProcedimento);
        const dataFimValidadeApacOnco = dataLimiteRegistroOncologico(dataPrimeira, competenciaFimAux);
        const competenciaDataLimite = competenciaDeDataUTC(dataFimValidadeApacOnco);
        competenciaFim = competenciaDataLimite === competenciaPrimeiroProcedimento
          ? competenciaPrimeiroProcedimento
          : competenciaFimAux;
      } else {
        competenciaFim = proximaCompetencia(competenciaPrimeiroProcedimento);
      }
      atualizar.competenciaFimApac = competenciaFim;

      // Validar que a data do último procedimento não pode ser maior que a data final da validade
      // Oncológico: primeiro critério é 30 dias corridos a partir da consulta (1º procedimento); considera-se também 2 competências
      // Geral: data final = último dia do mês da segunda competência
      const dataFimValidadeApac = tipoOci === 'ONCOLOGICO'
        ? dataLimiteRegistroOncologico(dataPrimeira, competenciaFim)
        : dataFimCompetencia(competenciaFim);
      if (dataUltima > dataFimValidadeApac) {
        const mesFim = competenciaFim.slice(4, 6);
        const anoFim = competenciaFim.slice(0, 4);
        const mesmaComp = competenciaFim === competenciaPrimeiroProcedimento;
        const msgOnco = tipoOci === 'ONCOLOGICO'
          ? `Para OCI oncológica o prazo é de 30 dias corridos a partir da consulta médica especializada (${dataPrimeira.toLocaleDateString('pt-BR')}). `
          : '';
        const msgComp = mesmaComp
          ? `Competência de apresentação: ${competenciaFim.slice(4, 6)}/${competenciaFim.slice(0, 4)}. `
          : `A validade da APAC é de 2 competências: ${competenciaPrimeiroProcedimento.slice(4, 6)}/${competenciaPrimeiroProcedimento.slice(0, 4)} e ${mesFim}/${anoFim}. `;
        throw new Error(
          msgOnco +
          `A data do último procedimento (${dataUltima.toLocaleDateString('pt-BR')}) não pode ultrapassar a data limite (${dataFimValidadeApac.toLocaleDateString('pt-BR')}). ` +
          msgComp +
          `O registro dos procedimentos deve ser realizado até a data limite indicada.`
        );
      }

      // Validar procedimentos obrigatórios da OCI (regra: grupo consulta/teleconsulta exige apenas 1 realizada)
      const ociComProcedimentos = await this.prisma.oci.findUnique({
        where: { id: sol.ociId },
        include: { procedimentos: { where: { obrigatorio: true }, orderBy: { ordem: 'asc' } } }
      });

      const todasExecucoes = await this.prisma.execucaoProcedimento.findMany({
        where: { solicitacaoId: execucao.solicitacaoId },
        include: { procedimento: true }
      });

      if (ociComProcedimentos && ociComProcedimentos.procedimentos.length > 0) {
        const procedimentosObrigatorios: ProcedimentoObrigatorio[] =
          ociComProcedimentos.procedimentos.map((p) => ({
            id: p.id,
            codigo: p.codigo,
            nome: p.nome
          }));
        const execucoesParaValidacao: ExecucaoParaValidacao[] = todasExecucoes.map((e) => ({
          status: e.status,
          procedimento: {
            id: e.procedimento.id,
            codigo: e.procedimento.codigo,
            nome: e.procedimento.nome
          }
        }));
        const validacaoProcedimentos = validarProcedimentosObrigatoriosOci(
          procedimentosObrigatorios,
          execucoesParaValidacao
        );
        if (!validacaoProcedimentos.valido) {
          console.warn(`⚠️ Aviso na solicitação ${execucao.solicitacaoId}: ${validacaoProcedimentos.erro}`);
        }
      }

      // Conclusão: obrigatórios satisfeitos (grupo consulta/teleconsulta: basta 1 realizada; demais: todos)
      let obrigatoriosOk = false;
      if (ociComProcedimentos && ociComProcedimentos.procedimentos.length > 0) {
        const procedimentosObrigatorios: ProcedimentoObrigatorio[] =
          ociComProcedimentos.procedimentos.map((p) => ({
            id: p.id,
            codigo: p.codigo,
            nome: p.nome
          }));
        const execucoesComProcedimento: ExecucaoParaValidacao[] = todasExecucoes.map((e) => ({
          status: e.status,
          procedimento: { id: e.procedimento.id, codigo: e.procedimento.codigo, nome: e.procedimento.nome }
        }));
        obrigatoriosOk = obrigatoriosSatisfeitos(procedimentosObrigatorios, execucoesComProcedimento);
      } else {
        // Fallback: sem obrigatórios na OCI, considerar concluída quando todos executados
        obrigatoriosOk = sol.execucoes.every((e) => e.status === 'EXECUTADO');
      }

      if (obrigatoriosOk && sol.status !== StatusSolicitacao.CONCLUIDA) {
        atualizar.dataConclusao = new Date();
        atualizar.status = StatusSolicitacao.CONCLUIDA;
      }
    } else {
      // Se não há mais procedimentos executados, limpar as datas de validade APAC
      atualizar.dataInicioValidadeApac = null;
      atualizar.dataEncerramentoApac = null;
      atualizar.competenciaInicioApac = null;
      atualizar.competenciaFimApac = null;
    }

    if (Object.keys(atualizar).length > 0) {
      await this.prisma.solicitacaoOci.update({
        where: { id: execucao.solicitacaoId },
        data: atualizar
      });

      // Atualizar alerta após mudança nas competências APAC
      await this.atualizarAlertaPrazo(execucao.solicitacaoId);
    }

    return execucao;
  }

  async verificarPrazosVencidos() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const vencidas = await this.prisma.solicitacaoOci.findMany({
      where: {
        deletedAt: null,
        dataPrazo: { lt: hoje },
        status: {
          notIn: [StatusSolicitacao.CONCLUIDA, StatusSolicitacao.CANCELADA, StatusSolicitacao.VENCIDA]
        }
      }
    });

    for (const solicitacao of vencidas) {
      await this.prisma.solicitacaoOci.update({
        where: { id: solicitacao.id },
        data: { status: StatusSolicitacao.VENCIDA }
      });
      await this.atualizarAlertaPrazo(solicitacao.id);
    }

    return vencidas.length;
  }

  async excluirSolicitacao(id: string) {
    const solicitacao = await this.prisma.solicitacaoOci.findUnique({
      where: { id },
      include: {
        execucoes: {
          select: {
            id: true,
            status: true,
            dataExecucao: true
          }
        }
      }
    });

    if (!solicitacao) {
      throw new Error('Solicitação não encontrada');
    }

    // Verificar se há número de autorização APAC registrado
    if (solicitacao.numeroAutorizacaoApac) {
      throw new Error(
        `Não é possível excluir esta solicitação pois possui número de autorização APAC registrado: ${solicitacao.numeroAutorizacaoApac}. ` +
        `Para excluir, primeiro remova o número de autorização APAC.`
      );
    }

    // Verificar se há procedimentos executados
    const procedimentosExecutados = solicitacao.execucoes.filter(
      execucao => execucao.status === 'EXECUTADO' && execucao.dataExecucao !== null
    );

    if (procedimentosExecutados.length > 0) {
      throw new Error(
        `Não é possível excluir esta solicitação pois possui ${procedimentosExecutados.length} procedimento(s) executado(s). ` +
        `Para excluir, primeiro remova ou cancele os procedimentos executados.`
      );
    }

    // Exclusão lógica (Soft Delete) para manter histórico/auditoria
    await this.prisma.solicitacaoOci.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return { message: 'Solicitação excluída com sucesso (arquivada)' };
  }

  async atualizarAutorizacaoApac(
    id: string,
    data: {
      numeroAutorizacaoApac: string;
      nomeProfissionalAutorizador: string;
      cnsProfissionalAutorizador: string;
      dataAutorizacaoApac: Date;
      motivoSaida?: string;
      dataDiagnosticoCitoHistopatologico?: Date | string | null;
      cidPrincipal?: string | null;
      cidSecundario?: string | null;
    }
  ) {
    const solicitacao = await this.prisma.solicitacaoOci.findUnique({
      where: { id },
      include: { oci: true }
    });

    if (!solicitacao) {
      throw new Error('Solicitação não encontrada');
    }

    const dadosAtualizacao: any = {
      numeroAutorizacaoApac: data.numeroAutorizacaoApac,
      nomeProfissionalAutorizador: data.nomeProfissionalAutorizador,
      cnsProfissionalAutorizador: data.cnsProfissionalAutorizador,
      dataAutorizacaoApac: data.dataAutorizacaoApac,
      tipoApac: '3' // Sempre APAC Única conforme Manual PMAE/OCI
    };

    // Se motivoSaida foi fornecido, validar
    if (data.motivoSaida !== undefined) {
      const validacaoMotivo = validarMotivoSaida(data.motivoSaida);
      if (!validacaoMotivo.valido) {
        throw new Error(validacaoMotivo.erro || 'Motivo de saída inválido.');
      }
      dadosAtualizacao.motivoSaida = data.motivoSaida;
    }

    // Campos específicos para oncologia
    if (solicitacao.oci.tipo === 'ONCOLOGICO') {
      if (data.dataDiagnosticoCitoHistopatologico !== undefined) {
        dadosAtualizacao.dataDiagnosticoCitoHistopatologico = data.dataDiagnosticoCitoHistopatologico
          ? new Date(data.dataDiagnosticoCitoHistopatologico)
          : null;
      }
      if (data.cidPrincipal !== undefined) {
        dadosAtualizacao.cidPrincipal = data.cidPrincipal || null;
      }
      if (data.cidSecundario !== undefined) {
        dadosAtualizacao.cidSecundario = data.cidSecundario || null;
      }
    }

    const atualizada = await this.prisma.solicitacaoOci.update({
      where: { id },
      data: dadosAtualizacao
    });

    return atualizada;
  }
}
