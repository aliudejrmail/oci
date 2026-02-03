import { PrismaClient, StatusSolicitacao, TipoOci } from '@prisma/client';
import { STATUS_EXECUCAO } from '../constants/status-execucao';

export type FiltrosRelatorio = {
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;
  status?: StatusSolicitacao;
  unidadeId?: string;
  tipoOci?: TipoOci;
};

function buildWhere(filtros: FiltrosRelatorio) {
  const where: Record<string, unknown> = {};
  if (filtros.dataInicio || filtros.dataFim) {
    where.dataSolicitacao = {};
    if (filtros.dataInicio) {
      (where.dataSolicitacao as Record<string, Date>).gte = new Date(filtros.dataInicio + 'T00:00:00');
    }
    if (filtros.dataFim) {
      (where.dataSolicitacao as Record<string, Date>).lte = new Date(filtros.dataFim + 'T23:59:59.999');
    }
  }
  if (filtros.status) where.status = filtros.status;
  if (filtros.unidadeId) {
    where.OR = [
      { unidadeOrigem: filtros.unidadeId },
      { unidadeDestino: filtros.unidadeId }
    ];
  }
  if (filtros.tipoOci) where.tipo = filtros.tipoOci;
  return where;
}

export class RelatoriosService {
  constructor(private prisma: PrismaClient) {}

  /** Resumo geral: totais, por status e por tipo OCI */
  async resumo(filtros: FiltrosRelatorio) {
    const where = buildWhere(filtros);
    const [total, porStatus, porTipo] = await Promise.all([
      this.prisma.solicitacaoOci.count({ where }),
      this.prisma.solicitacaoOci.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      this.prisma.solicitacaoOci.groupBy({
        by: ['tipo'],
        where,
        _count: true
      })
    ]);
    return {
      total,
      porStatus: porStatus.map((s) => ({ status: s.status, quantidade: s._count })),
      porTipo: porTipo.map((t) => ({ tipo: t.tipo, quantidade: t._count }))
    };
  }

  /** Solicitações listadas no período com filtros (para exportação/visualização) */
  async porPeriodo(filtros: FiltrosRelatorio, limite = 500) {
    const where = buildWhere(filtros);
    const solicitacoes = await this.prisma.solicitacaoOci.findMany({
      where,
      take: limite,
      orderBy: { dataSolicitacao: 'desc' },
      include: {
        paciente: { select: { nome: true, cpf: true } },
        oci: { select: { nome: true, codigo: true, tipo: true } }
      }
    });
    const total = await this.prisma.solicitacaoOci.count({ where });
    return { total, solicitacoes, limite };
  }

  /** Contagem por status */
  async porStatus(filtros: FiltrosRelatorio) {
    const where = buildWhere(filtros);
    const grupos = await this.prisma.solicitacaoOci.groupBy({
      by: ['status'],
      where,
      _count: true
    });
    return grupos.map((g) => ({ status: g.status, quantidade: g._count }));
  }

  /** Contagem por Unidade Solicitante */
  async porUnidadeOrigem(filtros: FiltrosRelatorio) {
    const where = buildWhere(filtros);
    const grupos = await this.prisma.solicitacaoOci.groupBy({
      by: ['unidadeOrigem'],
      where,
      _count: true
    });
    const ids = [...new Set(grupos.map((g) => g.unidadeOrigem))];
    const unidades = ids.length
      ? await this.prisma.unidadeSaude.findMany({
          where: { id: { in: ids } },
          select: { id: true, nome: true, cnes: true }
        })
      : [];
    const mapNome = Object.fromEntries(unidades.map((u) => [u.id, u.nome]));
    return grupos.map((g) => ({
      unidadeId: g.unidadeOrigem,
      unidadeNome: mapNome[g.unidadeOrigem] ?? g.unidadeOrigem,
      quantidade: g._count
    }));
  }

  /** Contagem por Unidade Executante */
  async porUnidadeDestino(filtros: FiltrosRelatorio) {
    const where = { ...buildWhere(filtros), unidadeDestino: { not: null } };
    const grupos = await this.prisma.solicitacaoOci.groupBy({
      by: ['unidadeDestino'],
      where,
      _count: true
    });
    const ids = grupos.map((g) => g.unidadeDestino).filter(Boolean) as string[];
    const unidades = ids.length
      ? await this.prisma.unidadeSaude.findMany({
          where: { id: { in: ids } },
          select: { id: true, nome: true, cnes: true }
        })
      : [];
    const mapNome = Object.fromEntries(unidades.map((u) => [u.id, u.nome]));
    return grupos.map((g) => ({
      unidadeId: g.unidadeDestino,
      unidadeNome: g.unidadeDestino ? mapNome[g.unidadeDestino] ?? g.unidadeDestino : null,
      quantidade: g._count
    }));
  }

  /** Contagem por tipo OCI (GERAL / ONCOLOGICO) */
  async porTipoOci(filtros: FiltrosRelatorio) {
    const where = buildWhere(filtros);
    const grupos = await this.prisma.solicitacaoOci.groupBy({
      by: ['tipo'],
      where,
      _count: true
    });
    return grupos.map((g) => ({ tipo: g.tipo, quantidade: g._count }));
  }

  /** Procedimentos executados no período (execuções com status REALIZADO e dataExecucao no intervalo) */
  async procedimentosExecutados(filtros: FiltrosRelatorio, limite = 500) {
    const whereExecucao: Record<string, unknown> = {
      status: STATUS_EXECUCAO.REALIZADO,
      dataExecucao: { not: null }
    };
    if (filtros.dataInicio || filtros.dataFim) {
      whereExecucao.dataExecucao = {};
      if (filtros.dataInicio) {
        (whereExecucao.dataExecucao as Record<string, Date>).gte = new Date(filtros.dataInicio + 'T00:00:00');
      }
      if (filtros.dataFim) {
        (whereExecucao.dataExecucao as Record<string, Date>).lte = new Date(filtros.dataFim + 'T23:59:59.999');
      }
    }
    // Filtro na solicitação: apenas status, unidade e tipo OCI (data do relatório é da execução)
    const whereSolicitacao: Record<string, unknown> = {};
    if (filtros.status) whereSolicitacao.status = filtros.status;
    if (filtros.unidadeId) {
      whereSolicitacao.OR = [
        { unidadeOrigem: filtros.unidadeId },
        { unidadeDestino: filtros.unidadeId }
      ];
    }
    if (filtros.tipoOci) whereSolicitacao.tipo = filtros.tipoOci;
    const execucoes = await this.prisma.execucaoProcedimento.findMany({
      where: {
        ...whereExecucao,
        solicitacao: whereSolicitacao
      },
      take: limite,
      orderBy: { dataExecucao: 'desc' },
      include: {
        procedimento: { select: { nome: true, codigo: true, tipo: true } },
        solicitacao: {
          select: {
            numeroProtocolo: true,
            status: true,
            paciente: { select: { nome: true } }
          }
        }
      }
    });
    const total = await this.prisma.execucaoProcedimento.count({
      where: {
        ...whereExecucao,
        solicitacao: whereSolicitacao
      }
    });
    return { total, execucoes, limite };
  }

  /** Tempo médio de conclusão (dias entre dataSolicitacao e dataConclusao) apenas para CONCLUIDA */
  async tempoMedioConclusao(filtros: FiltrosRelatorio) {
    const where = { ...buildWhere(filtros), status: StatusSolicitacao.CONCLUIDA, dataConclusao: { not: null } };
    const solicitacoes = await this.prisma.solicitacaoOci.findMany({
      where,
      select: { dataSolicitacao: true, dataConclusao: true }
    });
    if (solicitacoes.length === 0) {
      return { quantidade: 0, mediaDias: null, minDias: null, maxDias: null };
    }
    const dias = solicitacoes.map((s) => {
      const a = s.dataSolicitacao.getTime();
      const b = (s.dataConclusao as Date).getTime();
      return Math.round((b - a) / (1000 * 60 * 60 * 24));
    });
    const soma = dias.reduce((acc, d) => acc + d, 0);
    return {
      quantidade: dias.length,
      mediaDias: Math.round((soma / dias.length) * 10) / 10,
      minDias: Math.min(...dias),
      maxDias: Math.max(...dias)
    };
  }

  /** Evolução mensal: quantidade de solicitações criadas e concluídas por mês */
  async evolucaoMensal(filtros: FiltrosRelatorio, meses = 12) {
    const where = buildWhere(filtros);
    const inicio = filtros.dataInicio
      ? new Date(filtros.dataInicio + 'T00:00:00')
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() - meses);
          d.setDate(1);
          return d;
        })();
    const fim = filtros.dataFim
      ? new Date(filtros.dataFim + 'T23:59:59.999')
      : new Date();

    const [criadas, concluidas] = await Promise.all([
      this.prisma.solicitacaoOci.findMany({
        where: { ...where, dataSolicitacao: { gte: inicio, lte: fim } },
        select: { dataSolicitacao: true }
      }),
      this.prisma.solicitacaoOci.findMany({
        where: { ...where, status: StatusSolicitacao.CONCLUIDA, dataConclusao: { gte: inicio, lte: fim } },
        select: { dataConclusao: true }
      })
    ]);

    const porMes: Record<string, { criadas: number; concluidas: number }> = {};
    const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    criadas.forEach((s) => {
      const k = key(s.dataSolicitacao);
      if (!porMes[k]) porMes[k] = { criadas: 0, concluidas: 0 };
      porMes[k].criadas++;
    });
    concluidas.forEach((s) => {
      const dataConclusao = s.dataConclusao as Date;
      if (!dataConclusao) return;
      const k = key(dataConclusao);
      if (!porMes[k]) porMes[k] = { criadas: 0, concluidas: 0 };
      porMes[k].concluidas++;
    });

    const ordenado = Object.entries(porMes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, vals]) => ({ mes, ...vals }));
    return ordenado;
  }

  /** Lista de tipos de relatório disponíveis (opções para o front) */
  opcoes() {
    return [
      { id: 'resumo', label: 'Resumo geral (totais por status e tipo OCI)', descricao: 'Visão consolidada com totais e distribuição por status e tipo.' },
      { id: 'por-periodo', label: 'Solicitações por período', descricao: 'Lista de solicitações no intervalo com filtros opcionais.' },
      { id: 'por-status', label: 'Quantidade por status', descricao: 'Contagem de solicitações por status (Pendente, Em andamento, Concluída, etc.).' },
      { id: 'por-unidade-origem', label: 'Por Unidade Solicitante', descricao: 'Volume de solicitações por Unidade Solicitante.' },
      { id: 'por-unidade-destino', label: 'Por Unidade Executante', descricao: 'Volume por Unidade Executante.' },
      { id: 'por-tipo-oci', label: 'Por tipo de OCI', descricao: 'Quantidade por tipo (Geral / Oncológico).' },
      { id: 'procedimentos-executados', label: 'Procedimentos executados', descricao: 'Lista de procedimentos realizados no período.' },
      { id: 'tempo-medio-conclusao', label: 'Tempo médio de conclusão', descricao: 'Média de dias entre solicitação e conclusão.' },
      { id: 'evolucao-mensal', label: 'Evolução mensal', descricao: 'Solicitações criadas e concluídas por mês.' }
    ];
  }
}
