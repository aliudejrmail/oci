import { PrismaClient, StatusSolicitacao } from '@prisma/client';
import { STATUS_EXECUCAO } from '../constants/status-execucao';
import { dataFimCompetencia, dataLimiteRegistroOncologico, calcularDecimoDiaUtilMesSeguinte, calcularDiasRestantes, determinarNivelAlerta, calcularPrazoResultadoBiopsia, calcularPrazoResultadoBiopsiaOncologico } from '../utils/date.utils';
import { isProcedimentoAnatomoPatologico, obrigatoriosSatisfeitos, type ProcedimentoObrigatorio, type ExecucaoParaValidacao } from '../utils/validacao-apac.utils';

export class DashboardService {
  constructor(private prisma: PrismaClient) { }

  async obterEstatisticas(periodo?: { inicio: Date; fim: Date }) {
    const where: any = { deletedAt: null };
    if (periodo) {
      where.dataSolicitacao = {
        gte: periodo.inicio,
        lte: periodo.fim
      };
    }

    // Buscar todas as solicitações para análise de status
    const todasSolicitacoes = await this.prisma.solicitacaoOci.findMany({
      where,
      select: { id: true, status: true }
    });

    // Contar status manualmente (usando valores reais do banco)
    const contagemManual: Record<string, number> = {
      PENDENTE: 0,
      EM_ANDAMENTO: 0,
      CONCLUIDA: 0,
      VENCIDA: 0,
      CANCELADA: 0
    };

    todasSolicitacoes.forEach(sol => {
      const statusStr = sol.status as string;
      if (contagemManual.hasOwnProperty(statusStr)) {
        contagemManual[statusStr]++;
      } else {
        console.warn(`⚠️ Status desconhecido encontrado: "${statusStr}" na solicitação ${sol.id}`);
      }
    });

    const [
      totalSolicitacoes,
      pendentes,
      emAndamento,
      concluidas,
      vencidas,
      canceladas,
      porTipo
    ] = await Promise.all([
      this.prisma.solicitacaoOci.count({ where }),
      this.prisma.solicitacaoOci.count({ where: { ...where, status: StatusSolicitacao.PENDENTE } }),
      this.prisma.solicitacaoOci.count({ where: { ...where, status: StatusSolicitacao.EM_ANDAMENTO } }),
      this.prisma.solicitacaoOci.count({ where: { ...where, status: StatusSolicitacao.CONCLUIDA } }),
      this.prisma.solicitacaoOci.count({ where: { ...where, status: StatusSolicitacao.VENCIDA } }),
      this.prisma.solicitacaoOci.count({ where: { ...where, status: StatusSolicitacao.CANCELADA } }),
      this.prisma.solicitacaoOci.groupBy({
        by: ['tipo'],
        where,
        _count: true
      })
    ]);

    // Validar se há discrepâncias
    const discrepancia = {
      pendentes: pendentes !== contagemManual.PENDENTE,
      emAndamento: emAndamento !== contagemManual.EM_ANDAMENTO,
      concluidas: concluidas !== contagemManual.CONCLUIDA,
      vencidas: vencidas !== contagemManual.VENCIDA,
      canceladas: canceladas !== contagemManual.CANCELADA
    };

    if (Object.values(discrepancia).some(d => d)) {
      console.warn('⚠️ Discrepância detectada nas estatísticas:', {
        pendentes: { prisma: pendentes, manual: contagemManual.PENDENTE },
        emAndamento: { prisma: emAndamento, manual: contagemManual.EM_ANDAMENTO },
        concluidas: { prisma: concluidas, manual: contagemManual.CONCLUIDA },
        vencidas: { prisma: vencidas, manual: contagemManual.VENCIDA },
        canceladas: { prisma: canceladas, manual: contagemManual.CANCELADA }
      });
    }

    // Usar contagem manual se houver discrepância, senão usar Prisma
    const pendentesFinal = discrepancia.pendentes ? contagemManual.PENDENTE : pendentes;
    const emAndamentoFinal = discrepancia.emAndamento ? contagemManual.EM_ANDAMENTO : emAndamento;
    const concluidasFinal = discrepancia.concluidas ? contagemManual.CONCLUIDA : concluidas;
    const vencidasFinal = discrepancia.vencidas ? contagemManual.VENCIDA : vencidas;
    const canceladasFinal = discrepancia.canceladas ? contagemManual.CANCELADA : canceladas;

    // Calcular taxa de conclusão
    const taxaConclusao = totalSolicitacoes > 0
      ? (concluidasFinal / totalSolicitacoes) * 100
      : 0;

    // Calcular tempo médio de conclusão
    const concluidasComData = await this.prisma.solicitacaoOci.findMany({
      where: {
        ...where,
        status: StatusSolicitacao.CONCLUIDA,
        dataConclusao: { not: null }
      },
      select: {
        dataSolicitacao: true,
        dataConclusao: true
      }
    });

    let tempoMedioDias = 0;
    if (concluidasComData.length > 0) {
      const tempos = concluidasComData.map(s => {
        const diff = s.dataConclusao!.getTime() - s.dataSolicitacao.getTime();
        return diff / (1000 * 60 * 60 * 24);
      });
      tempoMedioDias = tempos.reduce((a, b) => a + b, 0) / tempos.length;
    }

    return {
      totalSolicitacoes,
      porStatus: {
        pendentes: pendentesFinal,
        emAndamento: emAndamentoFinal,
        concluidas: concluidasFinal,
        vencidas: vencidasFinal,
        canceladas: canceladasFinal
      },
      porTipo: porTipo.reduce((acc, item) => {
        acc[item.tipo] = item._count;
        return acc;
      }, {} as Record<string, number>),
      indicadores: {
        taxaConclusao: Math.round(taxaConclusao * 100) / 100,
        tempoMedioConclusaoDias: Math.round(tempoMedioDias * 100) / 100
      }
    };
  }

  async obterAlertasPrazos() {
    try {
      // Buscar solicitações com alertas
      const alertas = await this.prisma.alertaPrazo.findMany({
        where: {
          solicitacao: {
            deletedAt: null,
            status: {
              notIn: [StatusSolicitacao.CONCLUIDA, StatusSolicitacao.CANCELADA]
            }
          }
        },
        include: {
          solicitacao: {
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
                    select: { id: true, codigo: true, nome: true }
                  }
                }
              },
              execucoes: {
                select: {
                  id: true,
                  status: true,
                  procedimento: {
                    select: { id: true, codigo: true, nome: true }
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { nivelAlerta: 'asc' }, // CRITICO primeiro
          { diasRestantes: 'asc' }
        ]
      });

      // Enriquecer cada alerta com prazos relevantes
      // Quando há competência APAC: diasRestantes refere-se EXCLUSIVAMENTE à DATA LIMITE para REGISTRO/REALIZAÇÃO de procedimentos
      const alertasEnriquecidos = alertas.map((alerta) => {
        const sol = alerta.solicitacao as any;
        let prazoApresentacaoApac: Date | null = null;
        let tipoPrazo: string = 'Prazo OCI';
        let dataFimValidadeApac: Date | null = null;
        let diasRestantesExibir = alerta.diasRestantes;

        if (sol.competenciaFimApac) {
          // Oncológico: primeiro critério 30 dias desde a consulta; considera-se também 2 competências
          const tipoOci = sol.oci?.tipo ?? (sol as any).tipo;
          dataFimValidadeApac = (tipoOci === 'ONCOLOGICO' && sol.dataInicioValidadeApac)
            ? dataLimiteRegistroOncologico(sol.dataInicioValidadeApac, sol.competenciaFimApac)
            : dataFimCompetencia(sol.competenciaFimApac);
          prazoApresentacaoApac = calcularDecimoDiaUtilMesSeguinte(sol.competenciaFimApac);
          tipoPrazo = 'Data limite registro procedimentos';

          // Verificar se os procedimentos obrigatórios já estão satisfeitos
          const procedimentosObrigatorios = sol.oci?.procedimentos || [];
          const execucoesParaValidacao: ExecucaoParaValidacao[] = (sol.execucoes || []).map((exec: any) => ({
            status: exec.status,
            procedimento: {
              id: exec.procedimento.id,
              codigo: exec.procedimento.codigo || '',
              nome: exec.procedimento.nome || ''
            }
          }));

          if (obrigatoriosSatisfeitos(procedimentosObrigatorios, execucoesParaValidacao)) {
            tipoPrazo = 'Pendente registro de APAC';
          }

          // Dias restantes: SEMPRE em relação ao REGISTRO/REALIZAÇÃO de procedimentos (ex: 31/01), NUNCA à apresentação APAC (5º dia útil)
          diasRestantesExibir = calcularDiasRestantes(dataFimValidadeApac);
          // Recalcular nivelAlerta com base nos dias até o registro de procedimentos
          alerta = { ...alerta, nivelAlerta: determinarNivelAlerta(diasRestantesExibir, sol.oci?.tipo || 'GERAL') };
        } else {
          prazoApresentacaoApac = sol.dataPrazo ? new Date(sol.dataPrazo) : null;
        }

        return {
          ...alerta,
          prazoRelevante: dataFimValidadeApac ?? prazoApresentacaoApac, // Prazo usado para dias restantes
          prazoApresentacaoApac,
          tipoPrazo,
          dataFimValidadeApac,
          diasRestantes: diasRestantesExibir
        };
      });

      return alertasEnriquecidos || [];
    } catch (error: any) {
      console.error('❌ Erro ao obter alertas de prazos:', error);
      console.error('Stack:', error.stack);
      // Retornar array vazio em caso de erro
      return [];
    }
  }

  /**
   * Alertas de resultado de biópsia pendente.
   * Apenas para procedimentos ANATOMO-PATOLÓGICOS obrigatórios: coleta já registrada, resultado pendente.
   * OCI oncológica: prazo = 30 dias desde a consulta especializada. OCI geral: prazo = 30 dias desde a coleta.
   */
  async obterAlertasResultadoBiopsiaPendente() {
    try {
      const execucoes = await this.prisma.execucaoProcedimento.findMany({
        where: {
          dataColetaMaterialBiopsia: { not: null },
          dataRegistroResultadoBiopsia: null,
          status: { not: STATUS_EXECUCAO.REALIZADO },
          procedimento: { obrigatorio: true },
          solicitacao: {
            deletedAt: null,
            status: {
              notIn: [StatusSolicitacao.CONCLUIDA, StatusSolicitacao.CANCELADA]
            }
          }
        },
        include: {
          solicitacao: {
            include: {
              paciente: { select: { id: true, nome: true, cpf: true } },
              oci: { select: { id: true, codigo: true, nome: true, tipo: true } }
            }
          },
          procedimento: { select: { id: true, nome: true, codigo: true } }
        }
      });

      // Filtrar apenas os que são anatomo-patológicos (nome contém anatomo E patol)
      const execucoesAnatomo = execucoes.filter((e) => isProcedimentoAnatomoPatologico(e.procedimento.nome));

      const alertas = execucoesAnatomo.map((exec) => {
        const dataColeta = exec.dataColetaMaterialBiopsia!;
        const tipoOci = (exec.solicitacao.oci?.tipo ?? (exec.solicitacao as any).tipo ?? 'GERAL') as 'GERAL' | 'ONCOLOGICO';
        const dataConsulta = (exec.solicitacao as any).dataInicioValidadeApac as Date | null | undefined;
        const prazoResultado = tipoOci === 'ONCOLOGICO' && dataConsulta
          ? calcularPrazoResultadoBiopsiaOncologico(dataConsulta)
          : calcularPrazoResultadoBiopsia(tipoOci, dataColeta);
        const diasRestantes = calcularDiasRestantes(prazoResultado);
        const nivelAlerta = determinarNivelAlerta(diasRestantes, tipoOci);
        return {
          id: exec.id,
          diasRestantes,
          nivelAlerta,
          prazoResultado,
          tipoOci,
          tipoPrazo: 'Resultado anatomo-patológico',
          dataColeta,
          solicitacao: exec.solicitacao,
          procedimento: exec.procedimento
        };
      });

      alertas.sort((a, b) => a.diasRestantes - b.diasRestantes);
      return alertas;
    } catch (error: any) {
      console.error('❌ Erro ao obter alertas de resultado anatomo-patológico pendente:', error);
      return [];
    }
  }

  async obterSolicitacoesProximasVencimento(limite: number = 10) {
    const hoje = new Date();
    const proximosDias = new Date();
    proximosDias.setDate(proximosDias.getDate() + 15); // Próximos 15 dias

    return await this.prisma.solicitacaoOci.findMany({
      where: {
        deletedAt: null,
        dataPrazo: {
          gte: hoje,
          lte: proximosDias
        },
        status: {
          notIn: [StatusSolicitacao.CONCLUIDA, StatusSolicitacao.CANCELADA]
        }
      },
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
        alerta: true
      },
      orderBy: {
        dataPrazo: 'asc'
      },
      take: limite
    });
  }

  async obterEvolucaoTemporal(dias: number = 30) {
    try {
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - dias);

      const solicitacoes = await this.prisma.solicitacaoOci.findMany({
        where: {
          deletedAt: null,
          dataSolicitacao: {
            gte: inicio
          }
        },
        select: {
          dataSolicitacao: true,
          status: true,
          tipo: true
        }
      });

      // Agrupar por dia
      const evolucao: Record<string, {
        total: number;
        concluidas: number;
        porTipo: Record<string, number>;
      }> = {};

      solicitacoes.forEach(s => {
        const data = s.dataSolicitacao.toISOString().split('T')[0];
        if (!evolucao[data]) {
          evolucao[data] = {
            total: 0,
            concluidas: 0,
            porTipo: {}
          };
        }
        evolucao[data].total++;
        if (s.status === StatusSolicitacao.CONCLUIDA) {
          evolucao[data].concluidas++;
        }
        evolucao[data].porTipo[s.tipo] = (evolucao[data].porTipo[s.tipo] || 0) + 1;
      });

      return Object.entries(evolucao)
        .map(([data, valores]) => ({
          data,
          ...valores
        }))
        .sort((a, b) => a.data.localeCompare(b.data));
    } catch (error: any) {
      console.error('❌ Erro ao obter evolução temporal:', error);
      console.error('Stack:', error.stack);
      return [];
    }
  }

  async obterApacsProximasVencimento() {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Buscar solicitações com APAC autorizada e competência fim definida
      const solicitacoesComApac = await this.prisma.solicitacaoOci.findMany({
        where: {
          deletedAt: null,
          numeroAutorizacaoApac: { not: null },
          competenciaFimApac: { not: null },
          status: {
            notIn: [StatusSolicitacao.CONCLUIDA, StatusSolicitacao.CANCELADA]
          }
        },
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
          }
        }
      });

      // Filtrar apenas as que estão próximas do vencimento (20 dias ou menos)
      // Dias restantes em relação ao REGISTRO de procedimentos (data limite), não à apresentação APAC
      const apacsProximasVencimento = solicitacoesComApac
        .map((sol) => {
          try {
            const tipoOci = sol.oci?.tipo;
            const dataFimValidadeApac = (tipoOci === 'ONCOLOGICO' && sol.dataInicioValidadeApac)
              ? dataLimiteRegistroOncologico(sol.dataInicioValidadeApac, sol.competenciaFimApac!)
              : dataFimCompetencia(sol.competenciaFimApac!);
            const diasRestantes = calcularDiasRestantes(dataFimValidadeApac);
            return {
              ...sol,
              diasRestantesCompetenciaApac: diasRestantes,
              dataFimValidadeApac
            };
          } catch (error: any) {
            console.error(`Erro ao calcular dias restantes para solicitação ${sol.id}:`, error);
            return null;
          }
        })
        .filter((sol): sol is NonNullable<typeof sol> => sol !== null && sol.diasRestantesCompetenciaApac !== null && sol.diasRestantesCompetenciaApac <= 20)
        .sort((a, b) => {
          // Ordenar por dias restantes (menor primeiro)
          const diasA = a.diasRestantesCompetenciaApac!;
          const diasB = b.diasRestantesCompetenciaApac!;
          return diasA - diasB;
        });

      return apacsProximasVencimento || [];
    } catch (error: any) {
      console.error('❌ Erro ao obter APACs próximas do vencimento:', error);
      console.error('Stack:', error.stack);
      return [];
    }
  }

  async obterSolicitacoesProximasPrazoRegistroProcedimentos() {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Buscar solicitações que:
      // 1. Têm primeiro procedimento registrado (dataInicioValidadeApac não é null)
      // 2. Têm competência fim APAC definida
      // 3. Estão em andamento (não concluídas nem canceladas)
      const solicitacoes = await this.prisma.solicitacaoOci.findMany({
        where: {
          deletedAt: null,
          dataInicioValidadeApac: { not: null },
          competenciaFimApac: { not: null },
          status: {
            in: [StatusSolicitacao.EM_ANDAMENTO, StatusSolicitacao.PENDENTE]
          }
        },
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
          execucoes: {
            select: {
              id: true,
              status: true,
              dataExecucao: true,
              procedimento: {
                select: {
                  id: true,
                  codigo: true,
                  nome: true
                }
              }
            }
          }
        }
      });

      // Calcular dias restantes: oncologia = 30 dias desde consulta (primeiro critério) ou fim 2ª competência; geral = fim 2ª competência
      const solicitacoesComPrazo = solicitacoes
        .map((sol) => {
          try {
            if (!sol.competenciaFimApac) return null;

            // Verificar se ainda há procedimentos obrigatórios pendentes usando a função que trata grupo consulta/teleconsulta
            const procedimentosObrigatorios = sol.oci?.procedimentos || [];
            if (procedimentosObrigatorios.length > 0) {
              // Mapear para formato esperado pela função obrigatoriosSatisfeitos
              const procedimentosParaValidacao: ProcedimentoObrigatorio[] = procedimentosObrigatorios.map(proc => ({
                id: proc.id,
                codigo: proc.codigo || '',
                nome: proc.nome || ''
              }));

              const execucoesParaValidacao: ExecucaoParaValidacao[] = sol.execucoes.map(exec => ({
                procedimentoId: exec.procedimento.id,
                status: exec.status,
                procedimento: {
                  id: exec.procedimento.id,
                  codigo: exec.procedimento.codigo || '',
                  nome: exec.procedimento.nome || ''
                }
              }));

              // Se todos os obrigatórios já foram realizados/dispensados corretamente, não mostrar alerta
              if (obrigatoriosSatisfeitos(procedimentosParaValidacao, execucoesParaValidacao)) {
                return null;
              }
            }

            const tipoOci = sol.oci?.tipo;
            const dataFimValidadeApac = (tipoOci === 'ONCOLOGICO' && sol.dataInicioValidadeApac)
              ? dataLimiteRegistroOncologico(sol.dataInicioValidadeApac, sol.competenciaFimApac)
              : dataFimCompetencia(sol.competenciaFimApac);
            dataFimValidadeApac.setHours(23, 59, 59, 999);
            const diffTime = dataFimValidadeApac.getTime() - hoje.getTime();
            const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return {
              ...sol,
              dataFimValidadeApac,
              diasRestantesPrazoRegistro: diasRestantes
            };
          } catch (error: any) {
            console.error(`Erro ao calcular prazo para registro de procedimentos na solicitação ${sol.id}:`, error);
            return null;
          }
        })
        .filter((sol): sol is NonNullable<typeof sol> => {
          // Filtrar apenas as que estão próximas do prazo (7 dias ou menos)
          return sol !== null && sol.diasRestantesPrazoRegistro !== null && sol.diasRestantesPrazoRegistro <= 7;
        })
        .sort((a, b) => {
          // Ordenar por dias restantes (menor primeiro)
          return a.diasRestantesPrazoRegistro - b.diasRestantesPrazoRegistro;
        });

      return solicitacoesComPrazo || [];
    } catch (error: any) {
      console.error('❌ Erro ao obter solicitações próximas do prazo para registro de procedimentos:', error);
      console.error('Stack:', error.stack);
      return [];
    }
  }

  /**
   * Notificações para perfil Autorizador:
   * - APACs pendentes: solicitações EM_ANDAMENTO sem número de autorização APAC
   * - Solicitações registradas recentemente: PENDENTE ou EM_ANDAMENTO cadastradas nos últimos 7 dias
   */
  async obterNotificacoesAutorizador() {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const seteDiasAtras = new Date(hoje);
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      // APACs pendentes: EM_ANDAMENTO sem numeroAutorizacaoApac
      const apacsPendentes = await this.prisma.solicitacaoOci.findMany({
        where: {
          deletedAt: null,
          status: StatusSolicitacao.EM_ANDAMENTO,
          numeroAutorizacaoApac: null,
          dataConclusao: null
        },
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
          }
        },
        orderBy: { dataSolicitacao: 'desc' },
        take: 50
      });

      // Solicitações registradas recentemente (últimos 7 dias)
      const solicitacoesRecentes = await this.prisma.solicitacaoOci.findMany({
        where: {
          deletedAt: null,
          dataSolicitacao: { gte: seteDiasAtras },
          status: {
            in: [StatusSolicitacao.PENDENTE, StatusSolicitacao.EM_ANDAMENTO]
          }
        },
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
          }
        },
        orderBy: { dataSolicitacao: 'desc' },
        take: 50
      });

      return {
        apacsPendentes,
        solicitacoesRecentes,
        totalApacsPendentes: apacsPendentes.length,
        totalSolicitacoesRecentes: solicitacoesRecentes.length
      };
    } catch (error: any) {
      console.error('❌ Erro ao obter notificações Autorizador:', error);
      return {
        apacsPendentes: [],
        solicitacoesRecentes: [],
        totalApacsPendentes: 0,
        totalSolicitacoesRecentes: 0
      };
    }
  }

}
