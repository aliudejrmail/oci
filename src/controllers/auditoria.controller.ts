import { Request, Response } from 'express';
import { AuditoriaService } from '../services/auditoria.service';
import { prisma } from '../database/prisma';

export class AuditoriaController {
    private service = new AuditoriaService(prisma);

    async listar(req: Request, res: Response) {
        try {
            const {
                usuarioId,
                acao,
                entidade,
                dataInicio,
                dataFim,
                page,
                limit
            } = req.query;

            const resultado = await this.service.listarLogs({
                usuarioId: usuarioId as string,
                acao: acao as string,
                entidade: entidade as string,
                dataInicio: dataInicio ? new Date(dataInicio as string) : undefined,
                dataFim: dataFim ? new Date(dataFim as string) : undefined,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined
            });

            return res.json(resultado);
        } catch (error: any) {
            console.error('Erro ao listar logs:', error);
            return res.status(500).json({ message: error.message || 'Erro ao listar logs de auditoria.' });
        }
    }

    async obterAcoesDisponiveis(_req: Request, res: Response) {
        try {
            const acoes = await prisma.auditoria.findMany({
                distinct: ['acao'],
                select: { acao: true },
                orderBy: { acao: 'asc' }
            });
            return res.json(acoes.map(a => a.acao));
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    }

    async obterEntidadesDisponiveis(_req: Request, res: Response) {
        try {
            const entidades = await prisma.auditoria.findMany({
                distinct: ['entidade'],
                select: { entidade: true },
                orderBy: { entidade: 'asc' }
            });
            return res.json(entidades.map(e => e.entidade));
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    }
}
