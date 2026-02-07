import { PrismaClient, StatusSolicitacao, TipoOci } from '@prisma/client';
import { STATUS_EXECUCAO } from '../constants/status-execucao';
import { calcularDataPrazo, calcularDiasRestantes, competenciaDeData, competenciaDeDataUTC, determinarNivelAlerta, proximaCompetencia, calcularDecimoDiaUtilMesSeguinte, dataFimCompetencia, dataLimiteRegistroOncologico } from '../utils/date.utils';
import { gerarNumeroProtocolo } from '../utils/gerador-protocolo.utils';
import {
  validarMotivoSaida,
  validarProcedimentosObrigatoriosOci,
  obrigatoriosSatisfeitos,
  isProcedimentoAnatomoPatologico,
  type ProcedimentoObrigatorio,
  type ExecucaoParaValidacao
} from '../utils/validacao-apac.utils';

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
    unidadeOrigemId?: string;
    unidadeDestinoId?: string;
    medicoSolicitanteId?: string;
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

    // Corrigido: considerar todos os procedimentos da OCI, inclusive customizados
    const procedimentosParaRegistrar = oci.procedimentos;
    if (procedimentosParaRegistrar.length === 0) {
      throw new Error(
        'Esta OCI não possui procedimentos cadastrados. Utilize apenas OCIs importadas ou configure os procedimentos manualmente.'
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

    const solicitacao = await this.prisma.$transaction(async (tx) => {
      const sol = await tx.solicitacaoOci.create({
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
          unidadeOrigemId: data.unidadeOrigemId,
          unidadeDestinoId: data.unidadeDestinoId,
          medicoSolicitanteId: data.medicoSolicitanteId,
          criadoPorId: data.criadoPorId,
          status: StatusSolicitacao.PENDENTE
        }
      });

      if (procedimentosParaRegistrar.length > 0) {
        await tx.execucaoProcedimento.createMany({
          data: procedimentosParaRegistrar.map((proc) => ({
            solicitacaoId: sol.id,
            procedimentoId: proc.id,
            status: STATUS_EXECUCAO.PENDENTE
          }))
        });
      }

      const diasRestantes = calcularDiasRestantes(dataPrazo);
      await tx.alertaPrazo.create({
        data: {
          solicitacaoId: sol.id,
          diasRestantes,
          nivelAlerta: determinarNivelAlerta(diasRestantes, oci.tipo)
        }
      });

      return sol;
    });

    return await this.buscarSolicitacaoPorId(solicitacao.id);
  }

  async buscarSolicitacaoPorId(id: string) {
    let solicitacao = await this.prisma.solicitacaoOci.findFirst({
      where: { id, deletedAt: null },
      include: {
        paciente: true,
        oci: {
          include: {
            procedimentos: { orderBy: { ordem: 'asc' } }
          }
        },
        execucoes: {
          include: {
            procedimento: true,
            unidadeExecutoraRef: { select: { cnes: true, nome: true } }
          },
          orderBy: { procedimento: { ordem: 'asc' } }
        },
        medicoSolicitante: { select: { id: true, nome: true, cns: true } },
        criadoPor: { select: { id: true, nome: true, email: true } },
        atualizadoPor: { select: { id: true, nome: true, email: true } },
        alerta: true,
        anexos: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!solicitacao) {
      throw new Error('Solicitação não encontrada');
    }

    // Sincronizar execuções pendentes para procedimentos novos
    if (solicitacao.oci && solicitacao.oci.procedimentos && solicitacao.oci.procedimentos.length) {
      const execucaoIds = new Set((solicitacao.execucoes || []).map(e => e.procedimento.id));
      const novosProcedimentos = solicitacao.oci.procedimentos.filter(p => !execucaoIds.has(p.id));
      if (novosProcedimentos.length > 0) {
        const solicitacaoId = solicitacao.id;
        if (!solicitacaoId) {
          throw new Error('Solicitação não encontrada ao criar execuções.');
        }
        await Promise.all(novosProcedimentos.map(p =>
          this.prisma.execucaoProcedimento.create({
            data: {
              solicitacaoId,
              procedimentoId: p.id,
              status: STATUS_EXECUCAO.PENDENTE
            }
          })
        ));
        // Recarregar execucoes
        solicitacao = await this.prisma.solicitacaoOci.findFirst({
          where: { id, deletedAt: null },
          include: {
            paciente: true,
            oci: { include: { procedimentos: { orderBy: { ordem: 'asc' } } } },
            execucoes: {
              include: {
                procedimento: true,
                unidadeExecutoraRef: { select: { cnes: true, nome: true } }
              },
              orderBy: { procedimento: { ordem: 'asc' } }
            },
            medicoSolicitante: { select: { id: true, nome: true, cns: true } },
            criadoPor: { select: { id: true, nome: true, email: true } },
            atualizadoPor: { select: { id: true, nome: true, email: true } },
            alerta: true,
            anexos: { orderBy: { createdAt: 'desc' } }
          }
        });
        if (!solicitacao) {
          throw new Error('Solicitação não encontrada após sincronizar execuções.');
        }
      }
    }

    // Garantir para o TypeScript que solicitacao não é null após possíveis recarregamentos
    if (!solicitacao) {
      throw new Error('Solicitação não encontrada após todas as tentativas de sincronização.');
    }

    // Enriquecer execuções: quando unidadeExecutora contém UUID (ID no campo errado), resolver o nome
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (solicitacao?.execucoes?.length) {
      const execucoesEnriquecidas = await Promise.all(
        solicitacao.execucoes.map(async (exec: any) => {
          const valor = exec.unidadeExecutora?.trim();
          const ehUuid = valor && uuidRegex.test(valor);
          const semRef = !exec.unidadeExecutoraRef;
          if (ehUuid && semRef) {
            const unidade = await this.prisma.unidadeSaude.findUnique({
              where: { id: valor },
              select: { id: true, cnes: true, nome: true }
            });
            if (unidade) {
              const displayNome = `${unidade.cnes} - ${unidade.nome}`;
              // Corrigir no banco para não precisar enriquecer em toda requisição
              await this.prisma.execucaoProcedimento.update({
                where: { id: exec.id },
                data: { unidadeExecutora: displayNome, unidadeExecutoraId: unidade.id }
              }).catch(() => {});
              return {
                ...exec,
                unidadeExecutora: displayNome,
                unidadeExecutoraRef: { cnes: unidade.cnes, nome: unidade.nome }
              };
            }
          }
          return exec;
        })
      );
      solicitacao = { ...solicitacao, execucoes: execucoesEnriquecidas };
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
    unidadeOrigemId?: string | null;
    unidadeDestinoId?: string | null;
    ociId?: string;
    medicoSolicitanteId?: string | null;
  }) {
    // Validar campos obrigatórios
    if (data.unidadeOrigem !== undefined && !data.unidadeOrigem.trim()) {
      throw new Error('Unidade de origem é obrigatória');
    }

    const solicitacaoAtual = await this.prisma.solicitacaoOci.findFirst({
      where: { id, deletedAt: null },
      include: { execucoes: true, oci: true }
    });

    if (!solicitacaoAtual) {
      throw new Error('Solicitação não encontrada');
    }

    // Se estiver alterando a OCI, verificar se nenhum procedimento foi registrado
    if (data.ociId && data.ociId !== solicitacaoAtual.ociId) {
      const algumRegistrado = solicitacaoAtual.execucoes.some(
        (e) => e.status !== STATUS_EXECUCAO.PENDENTE || e.dataExecucao != null
      );
      if (algumRegistrado) {
        throw new Error(
          'Não é possível alterar a OCI pois já existe pelo menos um procedimento registrado (executado ou agendado). Cancele a solicitação e crie uma nova se necessário.'
        );
      }

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

      const dataSolicitacao = solicitacaoAtual.dataSolicitacao;
      const dataPrazo = calcularDataPrazo(novaOci.tipo, dataSolicitacao);
      const diasRestantes = calcularDiasRestantes(dataPrazo);
      const nivelAlerta = determinarNivelAlerta(diasRestantes, novaOci.tipo);

      await this.prisma.$transaction(async (tx) => {
        await tx.execucaoProcedimento.deleteMany({ where: { solicitacaoId: id } });

        await tx.solicitacaoOci.update({
          where: { id },
          data: {
            ociId: data.ociId,
            tipo: novaOci.tipo,
            dataPrazo,
            observacoes: data.observacoes ?? solicitacaoAtual.observacoes,
            unidadeOrigem: data.unidadeOrigem ?? solicitacaoAtual.unidadeOrigem,
            unidadeDestino: data.unidadeDestino !== undefined ? data.unidadeDestino : solicitacaoAtual.unidadeDestino,
            unidadeOrigemId: data.unidadeOrigemId !== undefined ? data.unidadeOrigemId : solicitacaoAtual.unidadeOrigemId,
            unidadeDestinoId: data.unidadeDestinoId !== undefined ? data.unidadeDestinoId : solicitacaoAtual.unidadeDestinoId,
            medicoSolicitanteId: data.medicoSolicitanteId !== undefined ? data.medicoSolicitanteId : solicitacaoAtual.medicoSolicitanteId,
            updatedAt: new Date()
          }
        });

        await tx.execucaoProcedimento.createMany({
          data: procedimentosSigtap.map((proc) => ({
            solicitacaoId: id,
            procedimentoId: proc.id,
            status: STATUS_EXECUCAO.PENDENTE
          }))
        });

        await tx.alertaPrazo.upsert({
          where: { solicitacaoId: id },
          update: { diasRestantes, nivelAlerta },
          create: {
            solicitacaoId: id,
            diasRestantes,
            nivelAlerta
          }
        });
      });
    } else {
      await this.prisma.solicitacaoOci.update({
        where: { id },
        data: {
          observacoes: data.observacoes ?? solicitacaoAtual.observacoes,
          unidadeOrigem: data.unidadeOrigem ?? solicitacaoAtual.unidadeOrigem,
          unidadeDestino: data.unidadeDestino !== undefined ? data.unidadeDestino : solicitacaoAtual.unidadeDestino,
          unidadeOrigemId: data.unidadeOrigemId !== undefined ? data.unidadeOrigemId : solicitacaoAtual.unidadeOrigemId,
          unidadeDestinoId: data.unidadeDestinoId !== undefined ? data.unidadeDestinoId : solicitacaoAtual.unidadeDestinoId,
          medicoSolicitanteId: data.medicoSolicitanteId !== undefined ? data.medicoSolicitanteId : solicitacaoAtual.medicoSolicitanteId,
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
          execucoesFilter.status = STATUS_EXECUCAO.AGENDADO;
          execucoesFilter.unidadeExecutora = `${u.cnes} - ${u.nome}`;
        } else {
          execucoesFilter.executanteId = filtros.executanteId;
        }
      }
      if (filtros.unidadeExecutora && filtros.unidadeExecutora.trim()) {
        execucoesFilter.status = STATUS_EXECUCAO.AGENDADO;
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
                tipo: true,
                procedimentos: {
                  where: { obrigatorio: true },
                  select: {
                    id: true,
                    codigo: true,
                    nome: true
                  }
                }
              }
            },
            medicoSolicitante: {
              select: {
                id: true,
                nome: true,
                cns: true
              }
            },
            execucoes: {
              select: {
                id: true,
                status: true,
                procedimento: {
                  select: {
                    id: true,
                    codigo: true,
                    nome: true
                  }
                }
              }
            },
            alerta: true
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
            // Verificar se todos os procedimentos obrigatórios estão satisfeitos
            // Usar a função obrigatoriosSatisfeitos que trata corretamente o grupo consulta/teleconsulta
            const procedimentosObrigatorios = sol.oci?.procedimentos || [];
            let todosObrigatoriosRealizados = false;

            if (procedimentosObrigatorios.length > 0) {
              const procedimentosObrigatoriosMapeados: ProcedimentoObrigatorio[] = 
                procedimentosObrigatorios.map((p: any) => ({
                  id: p.id,
                  codigo: p.codigo,
                  nome: p.nome
                }));

              const execucoesMapeadas: ExecucaoParaValidacao[] = 
                (sol.execucoes || []).map((e: any) => ({
                  status: e.status,
                  procedimento: {
                    id: e.procedimento.id,
                    codigo: e.procedimento.codigo,
                    nome: e.procedimento.nome
                  }
                }));

              todosObrigatoriosRealizados = obrigatoriosSatisfeitos(
                procedimentosObrigatoriosMapeados,
                execucoesMapeadas
              );
            }

            const prazoApresentacaoApac = calcularDecimoDiaUtilMesSeguinte(sol.competenciaFimApac);
            const tipoOci = sol.oci?.tipo ?? sol.tipo;
            const dataFimValidadeApac = (tipoOci === 'ONCOLOGICO' && sol.dataInicioValidadeApac)
              ? dataLimiteRegistroOncologico(sol.dataInicioValidadeApac, sol.competenciaFimApac)
              : dataFimCompetencia(sol.competenciaFimApac);
            
            // Se todos obrigatórios estão satisfeitos, não exibir alerta de dias restantes
            if (todosObrigatoriosRealizados) {
              return {
                ...sol,
                prazoApresentacaoApac,
                dataFimValidadeApac,
                alerta: null // Remover alerta se todos obrigatórios foram satisfeitos
              };
            }

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
    const solicitacao = await this.prisma.solicitacaoOci.findFirst({
      where: { id, deletedAt: null },
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
      // Validação obrigatória: número de autorização APAC deve estar registrado
      if (!solicitacao.numeroAutorizacaoApac) {
        throw new Error(
          'Não é possível marcar como concluída: é obrigatório registrar o número de autorização APAC antes da conclusão. ' +
          'Use a opção "Registrar APAC" para informar o número de autorização.'
        );
      }

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
    const solicitacao = await this.prisma.solicitacaoOci.findFirst({
      where: { id: solicitacaoId, deletedAt: null },
      include: { oci: true }
    });

    if (!solicitacao) {
      return;
    }

    // Se a solicitação está concluída ou cancelada, remover o alerta
    if (solicitacao.status === StatusSolicitacao.CONCLUIDA || solicitacao.status === StatusSolicitacao.CANCELADA) {
      await this.prisma.alertaPrazo.deleteMany({
        where: { solicitacaoId }
      });
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
      unidadeExecutoraId?: string | null;
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

    // ANATOMO-PATOLÓGICO: determinar status automaticamente baseado nas datas
    const obrigatorio = (execucaoAtual.procedimento as any).obrigatorio !== false;
    const ehAnatomoPatologicoObrigatorio = obrigatorio && isProcedimentoAnatomoPatologico(execucaoAtual.procedimento.nome);
    
    if (ehAnatomoPatologicoObrigatorio) {
      const dataColetaFinal = data.dataColetaMaterialBiopsia || execucaoAtual.dataColetaMaterialBiopsia;
      const dataResultadoFinal = data.dataRegistroResultadoBiopsia || execucaoAtual.dataRegistroResultadoBiopsia;
      
      // Se está tentando marcar como REALIZADO mas não tem as duas datas
      if (data.status === STATUS_EXECUCAO.REALIZADO) {
        if (!dataColetaFinal || !dataResultadoFinal) {
          throw new Error(
            'Para procedimentos anatomo-patológicos obrigatórios, é necessário informar a data de coleta de material e a data do resultado para marcar como realizado.'
          );
        }
      }
      
      // Se não está explicitamente definindo um status, determinar automaticamente
      if (!data.status || data.status === STATUS_EXECUCAO.PENDENTE) {
        if (dataColetaFinal && dataResultadoFinal) {
          // Tem ambas as datas: REALIZADO
          data.status = STATUS_EXECUCAO.REALIZADO;
          if (!data.dataExecucao && !execucaoAtual.dataExecucao) {
            data.dataExecucao = dataResultadoFinal; // Usar data do resultado como data de execução
          }
        } else if (dataColetaFinal) {
          // Tem só coleta: AGUARDANDO_RESULTADO
          data.status = STATUS_EXECUCAO.AGUARDANDO_RESULTADO;
        } else {
          // Não tem nenhuma data: PENDENTE
          data.status = STATUS_EXECUCAO.PENDENTE;
        }
      }
    }

    // Normalizar datas para evitar problemas de timezone
    // Garantir que datas sejam interpretadas como início do dia no timezone local
    const dataAtualizacao: any = { ...data };

    // Só permitir marcar outros procedimentos como REALIZADO se a consulta médica especializada já tiver sido realizada
    const ehConsultaEspecializada = isConsultaMedicaEspecializada(execucaoAtual.procedimento.nome);
    
    // Lógica automática para AGUARDANDO_RESULTADO em procedimentos anatomo-patológicos (aplicar antes da validação)
    if (ehAnatomoPatologicoObrigatorio && !data.status) {
      const temColeta = data.dataColetaMaterialBiopsia != null || 
                       (execucaoAtual.dataColetaMaterialBiopsia != null && data.dataColetaMaterialBiopsia !== null);
      const temResultado = data.dataRegistroResultadoBiopsia != null || 
                          (execucaoAtual.dataRegistroResultadoBiopsia != null && data.dataRegistroResultadoBiopsia !== null);
      
      if (temColeta && !temResultado) {
        // Tem coleta mas não tem resultado -> AGUARDANDO_RESULTADO
        dataAtualizacao.status = STATUS_EXECUCAO.AGUARDANDO_RESULTADO;
      } else if (temColeta && temResultado) {
        // Tem coleta e resultado -> REALIZADO automaticamente (não precisa validar consulta especializada)
        dataAtualizacao.status = STATUS_EXECUCAO.REALIZADO;
        // Definir dataExecucao como a data da coleta se não estiver definida
        if (!data.dataExecucao && !execucaoAtual.dataExecucao) {
          dataAtualizacao.dataExecucao = data.dataColetaMaterialBiopsia || execucaoAtual.dataColetaMaterialBiopsia;
        }
      } else if (!temColeta && !temResultado) {
        // Não tem coleta nem resultado -> PENDENTE
        dataAtualizacao.status = STATUS_EXECUCAO.PENDENTE;
      }
    }
    
    // Aplicar validação da consulta especializada apenas para status explícitos (não automáticos)
    if (data.status === STATUS_EXECUCAO.REALIZADO && !ehConsultaEspecializada) {
      const solicitacaoComExecucoes = await this.prisma.solicitacaoOci.findFirst({
        where: { id: execucaoAtual.solicitacaoId, deletedAt: null },
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
            e.status === STATUS_EXECUCAO.REALIZADO &&
            e.dataExecucao != null
        );
        if (!consultaJaRealizada) {
          throw new Error(
            'O registro da consulta médica especializada deve ser realizado antes dos demais procedimentos. Registre primeiro a consulta médica (ou teleconsulta) em atenção especializada.'
          );
        }
      }
    }

    // Unidade executora: garantir que unidadeExecutora seja o nome (não UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const unidadeExecutoraPareceUuid = data.unidadeExecutora && uuidRegex.test(String(data.unidadeExecutora).trim());
    if (data.unidadeExecutoraId || unidadeExecutoraPareceUuid) {
      const unidadeId = data.unidadeExecutoraId || (unidadeExecutoraPareceUuid ? data.unidadeExecutora?.trim() : null);
      if (unidadeId) {
        const unidade = await this.prisma.unidadeSaude.findUnique({ where: { id: unidadeId } });
        if (unidade) {
          dataAtualizacao.unidadeExecutora = `${unidade.cnes} - ${unidade.nome}`;
          dataAtualizacao.unidadeExecutoraId = unidadeId;
        }
      }
    }
    
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
    
    // dataAgendamento: aceitar data+hora (agendamento), só data, ou null (para desagendar)
    if (data.dataAgendamento === null || data.dataAgendamento === undefined) {
      if (data.status === STATUS_EXECUCAO.PENDENTE) {
        dataAtualizacao.dataAgendamento = null;
        dataAtualizacao.unidadeExecutora = null;
        dataAtualizacao.unidadeExecutoraId = null;
        dataAtualizacao.executanteId = null;
      }
    } else if (data.dataAgendamento && typeof data.dataAgendamento === 'string') {
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
    
    // Atualizar a execução
    const execucao = await this.prisma.execucaoProcedimento.update({
      where: { id },
      data: dataAtualizacao,
      include: { solicitacao: true, procedimento: true }
    });

    // Regra consulta/teleconsulta especializada: ao marcar um como REALIZADO, os outros do grupo ficam DISPENSADO no banco
    const vaiParaExecutado = (data.status === STATUS_EXECUCAO.REALIZADO || dataAtualizacao?.status === STATUS_EXECUCAO.REALIZADO)
    const ehConsultaOuTeleconsultaEspecializada = isConsultaMedicaEspecializada(execucao.procedimento.nome)
    if (vaiParaExecutado && ehConsultaOuTeleconsultaEspecializada) {
      const outrasExecucoes = await this.prisma.execucaoProcedimento.findMany({
        where: {
          solicitacaoId: execucao.solicitacaoId,
          id: { not: id },
          status: { in: [STATUS_EXECUCAO.PENDENTE, STATUS_EXECUCAO.AGENDADO] }
        },
        include: { procedimento: true }
      });
      // Só marcar como DISPENSADO se o procedimento for obrigatório (não marcar consultas de retorno não obrigatórias)
      const outrasConsultaTeleconsulta = outrasExecucoes.filter((e) => {
        const obrigatorio = (e.procedimento as any).obrigatorio !== false;
        // NÃO dispensar o procedimento de retorno
        const ehRetorno = e.procedimento.codigo === 'OCI-RETORNO-01' || e.procedimento.nome.includes('RETORNO');
        return isConsultaMedicaEspecializada(e.procedimento.nome) && obrigatorio && !ehRetorno;
      });
      if (outrasConsultaTeleconsulta.length > 0) {
        await this.prisma.execucaoProcedimento.updateMany({
          where: { id: { in: outrasConsultaTeleconsulta.map((e) => e.id) } },
          data: { status: STATUS_EXECUCAO.DISPENSADO }
        });
      }
    }

    // Reverter DISPENSADO para PENDENTE quando o REALIZADO do grupo é desfeito
    const vaiParaPendente = (data.status === STATUS_EXECUCAO.PENDENTE || dataAtualizacao?.status === STATUS_EXECUCAO.PENDENTE) &&
      (data.dataExecucao === null || data.dataExecucao === undefined || dataAtualizacao?.dataExecucao === null)
    if (vaiParaPendente && ehConsultaOuTeleconsultaEspecializada) {
      const dispensadas = await this.prisma.execucaoProcedimento.findMany({
        where: { solicitacaoId: execucao.solicitacaoId, status: STATUS_EXECUCAO.DISPENSADO },
        include: { procedimento: true }
      });
      const idsReverter = dispensadas
        .filter((e) => isConsultaMedicaEspecializada(e.procedimento.nome))
        .map((e) => e.id);
      if (idsReverter.length > 0) {
        await this.prisma.execucaoProcedimento.updateMany({
          where: { id: { in: idsReverter } },
          data: { status: STATUS_EXECUCAO.PENDENTE }
        });
      }
    }

    // APAC: atualizar datas de início/encerramento da validade (Portaria 1640/2024 art. 15)
    // A data base inicial é a data do primeiro procedimento registrado (menor data entre todos)
    // Recalcular sempre que uma execução é atualizada (marcada ou desmarcada)
    const sol = await this.prisma.solicitacaoOci.findFirst({
      where: { id: execucao.solicitacaoId, deletedAt: null },
      include: { execucoes: true }
    });
    if (!sol) return execucao;

    // Buscar todas as execuções executadas (status REALIZADO e com dataExecucao não nula)
    // Após a atualização acima, a execução já está com o status e data corretos no banco
    const execucoesComData = sol.execucoes.filter(
      (e) => e.status === STATUS_EXECUCAO.REALIZADO && e.dataExecucao != null
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

      // Comentário: Conclusão automática removida - apenas conclusão manual é permitida
      // A lógica de verificação de procedimentos obrigatórios foi removida pois
      // a conclusão deve ser sempre manual, exigindo registro prévio do número APAC
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
    const solicitacao = await this.prisma.solicitacaoOci.findFirst({
      where: { id, deletedAt: null },
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
      execucao => execucao.status === STATUS_EXECUCAO.REALIZADO && execucao.dataExecucao !== null
    );

    if (procedimentosExecutados.length > 0) {
      throw new Error(
        `Não é possível excluir esta solicitação pois possui ${procedimentosExecutados.length} procedimento(s) executado(s). ` +
        `Para excluir, primeiro remova ou cancele os procedimentos executados.`
      );
    }

    // Soft delete: marca como excluída para auditoria (anexos e execuções permanecem)
    await this.prisma.solicitacaoOci.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return { message: 'Solicitação excluída com sucesso' };
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
    const solicitacao = await this.prisma.solicitacaoOci.findFirst({
      where: { id, deletedAt: null },
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
