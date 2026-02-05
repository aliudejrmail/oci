import { PrismaClient } from '@prisma/client';

export class ProfissionaisService {
  constructor(private prisma: PrismaClient) {}

  async listarProfissionais(filtros: {
    search?: string;
    ativo?: boolean;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filtros.page || 1;
      const limit = filtros.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filtros.ativo !== undefined) {
        where.ativo = filtros.ativo;
      }

      if (filtros.search) {
        where.OR = [
          { nome: { contains: filtros.search, mode: 'insensitive' } },
          { cns: { contains: filtros.search } },
          { cbo: { contains: filtros.search } }
        ];
      }

      const [profissionais, total] = await Promise.all([
        this.prisma.profissional.findMany({
          where,
          include: {
            unidades: {
              include: {
                unidade: {
                  select: {
                    id: true,
                    nome: true,
                    cnes: true
                  }
                }
              }
            },
            cboRelacao: {
              select: {
                id: true,
                codigo: true,
                descricao: true
              }
            }
          },
          orderBy: { nome: 'asc' },
          skip,
          take: limit
        }),
        this.prisma.profissional.count({ where })
      ]);

      return {
        profissionais,
        paginacao: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      console.error('Erro no service listarProfissionais:', error);
      throw error;
    }
  }

  async buscarProfissionalPorId(id: string) {
    return await this.prisma.profissional.findUnique({
      where: { id },
      include: {
        unidades: {
          include: {
            unidade: {
              select: {
                id: true,
                nome: true,
                cnes: true
              }
            }
          }
        },
        cboRelacao: {
          select: {
            id: true,
            codigo: true,
            descricao: true
          }
        }
      }
    });
  }

  async listarCbos() {
    return await this.prisma.cbo.findMany({
      where: { ativo: true },
      orderBy: { descricao: 'asc' }
    });
  }

  async criarProfissional(data: {
    nome: string;
    cns: string;
    cboId: string;
    unidadesIds?: string[];
  }) {
    // Validar CNS (15 dígitos)
    const cnsLimpo = data.cns.replace(/\D/g, '');
    if (cnsLimpo.length !== 15) {
      throw new Error('O CNS deve conter exatamente 15 dígitos.');
    }

    // Verificar se já existe profissional com esse CNS
    const existente = await this.prisma.profissional.findUnique({
      where: { cns: cnsLimpo }
    });

    if (existente) {
      throw new Error('Já existe um profissional cadastrado com este CNS.');
    }

    // Criar profissional com unidades
    const profissional = await this.prisma.profissional.create({
      data: {
        nome: data.nome.trim(),
        cns: cnsLimpo,
        cboId: data.cboId,
        unidades: data.unidadesIds && data.unidadesIds.length > 0 ? {
          create: data.unidadesIds.map(unidadeId => ({
            unidadeId
          }))
        } : undefined
      },
      include: {
        unidades: {
          include: {
            unidade: {
              select: {
                id: true,
                nome: true,
                cnes: true
              }
            }
          }
        },
        cboRelacao: {
          select: {
            id: true,
            codigo: true,
            descricao: true
          }
        }
      }
    });

    return profissional;
  }

  async atualizarProfissional(id: string, data: {
    nome?: string;
    cns?: string;
    cboId?: string;
    ativo?: boolean;
    unidadesIds?: string[];
  }) {
    const profissional = await this.prisma.profissional.findUnique({
      where: { id }
    });

    if (!profissional) {
      throw new Error('Profissional não encontrado');
    }

    const updateData: any = {};

    if (data.nome !== undefined) {
      updateData.nome = data.nome.trim();
    }

    if (data.cns !== undefined) {
      const cnsLimpo = data.cns.replace(/\D/g, '');
      if (cnsLimpo.length !== 15) {
        throw new Error('O CNS deve conter exatamente 15 dígitos.');
      }

      // Verificar se outro profissional já usa esse CNS
      const existente = await this.prisma.profissional.findUnique({
        where: { cns: cnsLimpo }
      });

      if (existente && existente.id !== id) {
        throw new Error('Já existe outro profissional cadastrado com este CNS.');
      }

      updateData.cns = cnsLimpo;
    }

    if (data.cboId !== undefined) {
      updateData.cboId = data.cboId;
    }

    if (data.ativo !== undefined) {
      updateData.ativo = data.ativo;
    }

    // Atualizar unidades se fornecido
    if (data.unidadesIds !== undefined) {
      // Remover todas as relações existentes
      await this.prisma.profissionalUnidade.deleteMany({
        where: { profissionalId: id }
      });

      // Criar novas relações
      if (data.unidadesIds.length > 0) {
        updateData.unidades = {
          create: data.unidadesIds.map(unidadeId => ({
            unidadeId
          }))
        };
      }
    }

    return await this.prisma.profissional.update({
      where: { id },
      data: updateData,
      include: {
        unidades: {
          include: {
            unidade: {
              select: {
                id: true,
                nome: true,
                cnes: true
              }
            }
          }
        },
        cboRelacao: {
          select: {
            id: true,
            codigo: true,
            descricao: true
          }
        }
      }
    });
  }

  async excluirProfissional(id: string) {
    const profissional = await this.prisma.profissional.findUnique({
      where: { id }
    });

    if (!profissional) {
      throw new Error('Profissional não encontrado');
    }

    // Verificar se há solicitações com autorização APAC deste profissional
    const totalAutorizacoes = await this.prisma.solicitacaoOci.count({
      where: {
        cnsProfissionalAutorizador: profissional.cns,
        numeroAutorizacaoApac: { not: null }
      }
    });

    if (totalAutorizacoes > 0) {
      throw new Error(
        `Não é possível excluir este profissional pois ele possui ${totalAutorizacoes} autorização(ões) APAC registrada(s) no sistema. ` +
        `Para excluir, primeiro remova ou altere as autorizações APAC associadas a este profissional.`
      );
    }

    await this.prisma.profissional.delete({
      where: { id }
    });

    return { message: 'Profissional excluído com sucesso' };
  }
}
