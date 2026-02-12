import { PrismaClient } from '@prisma/client';

export interface AuditData {
    usuarioId?: string;
    acao: string;
    entidade: string;
    entidadeId?: string;
    detalhes?: string;
    ip?: string;
    userAgent?: string;
}

export class AuditoriaService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Registra uma ação no log de auditoria
     */
    async log(data: AuditData) {
        try {
            return await this.prisma.auditoria.create({
                data: {
                    usuarioId: data.usuarioId,
                    acao: data.acao,
                    entidade: data.entidade,
                    entidadeId: data.entidadeId,
                    detalhes: data.detalhes,
                    ip: data.ip,
                    userAgent: data.userAgent,
                },
            });
        } catch (error) {
            console.error('❌ Erro ao registrar log de auditoria:', error);
            // Não lançamos erro para não interromper a ação principal
            return null;
        }
    }

    /**
     * Lista logs de auditoria com filtros e paginação
     */
    async listarLogs(filtros: {
        usuarioId?: string;
        acao?: string;
        entidade?: string;
        dataInicio?: Date;
        dataFim?: Date;
        page?: number;
        limit?: number;
    }) {
        const page = filtros.page || 1;
        const limit = Math.min(filtros.limit || 50, 200);
        const skip = (page - 1) * limit;

        const where: any = {};

        if (filtros.usuarioId) {
            where.usuarioId = filtros.usuarioId;
        }

        if (filtros.acao) {
            where.acao = filtros.acao;
        }

        if (filtros.entidade) {
            where.entidade = filtros.entidade;
        }

        if (filtros.dataInicio || filtros.dataFim) {
            where.createdAt = {};
            if (filtros.dataInicio) {
                where.createdAt.gte = filtros.dataInicio;
            }
            if (filtros.dataFim) {
                where.createdAt.lte = filtros.dataFim;
            }
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditoria.findMany({
                where,
                include: {
                    usuario: {
                        select: {
                            id: true,
                            nome: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit
            }),
            this.prisma.auditoria.count({ where })
        ]);

        return {
            logs,
            paginacao: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}
