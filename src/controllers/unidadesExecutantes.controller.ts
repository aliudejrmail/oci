import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

/** Unidades executantes são UnidadeSaude com executante=1 (mesma tabela unidades_saude). */
export class UnidadesExecutantesController {
  /** Lista todas as unidades de saúde do banco (com filtro opcional por ativo e busca). */
  async listar(req: Request, res: Response) {
    try {
      const { search, ativo } = req.query;
      const where: any = {};
      if (ativo !== undefined) where.ativo = ativo === 'true';
      if (search && typeof search === 'string') {
        const s = search.trim();
        if (s) {
          where.OR = [
            { nome: { contains: s, mode: 'insensitive' } },
            { cnes: { contains: s } }
          ];
        }
      }
      const unidades = await prisma.unidadeSaude.findMany({
        where,
        orderBy: { nome: 'asc' }
      });
      return res.json(unidades);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Erro ao listar unidades.' });
    }
  }

  async criar(req: AuthRequest, res: Response) {
    try {
      const { cnes, nome, executante, solicitante } = req.body;
      if (!cnes || !nome) {
        return res.status(400).json({
          message: 'CNES e Nome do Estabelecimento de Saúde são obrigatórios.'
        });
      }
      const cnesLimpo = String(cnes).trim().replace(/\D/g, '');
      if (!cnesLimpo) {
        return res.status(400).json({ message: 'CNES inválido.' });
      }
      const exec = executante === 1 || executante === true ? 1 : 0;
      const sol = solicitante === 1 || solicitante === true ? 1 : 0;
      const existente = await prisma.unidadeSaude.findUnique({
        where: { cnes: cnesLimpo }
      });
      if (existente) {
        const unidade = await prisma.unidadeSaude.update({
          where: { id: existente.id },
          data: {
            nome: String(nome).trim(),
            executante: exec,
            solicitante: sol
          }
        });
        return res.status(201).json(unidade);
      }
      const unidade = await prisma.unidadeSaude.create({
        data: {
          cnes: cnesLimpo,
          nome: String(nome).trim(),
          executante: exec,
          solicitante: sol
        }
      });
      return res.status(201).json(unidade);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return res.status(400).json({ message: 'Já existe uma unidade com este CNES.' });
      }
      return res.status(500).json({ message: error.message || 'Erro ao criar unidade executante.' });
    }
  }

  async atualizar(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { cnes, nome, ativo, executante, solicitante } = req.body;
      const existente = await prisma.unidadeSaude.findUnique({ where: { id } });
      if (!existente) {
        return res.status(404).json({ message: 'Unidade não encontrada.' });
      }
      const updateData: any = {};
      if (nome !== undefined) updateData.nome = String(nome).trim();
      if (ativo !== undefined) updateData.ativo = !!ativo;
      if (executante !== undefined) updateData.executante = executante === 1 || executante === true ? 1 : 0;
      if (solicitante !== undefined) updateData.solicitante = solicitante === 1 || solicitante === true ? 1 : 0;
      if (cnes !== undefined) {
        const cnesLimpo = String(cnes).trim().replace(/\D/g, '');
        if (!cnesLimpo) return res.status(400).json({ message: 'CNES inválido.' });
        updateData.cnes = cnesLimpo;
      }
      const unidade = await prisma.unidadeSaude.update({
        where: { id },
        data: updateData
      });
      return res.json(unidade);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        return res.status(404).json({ message: 'Unidade executante não encontrada.' });
      }
      if (error?.code === 'P2002') {
        return res.status(400).json({ message: 'Já existe outra unidade com este CNES.' });
      }
      return res.status(500).json({ message: error.message || 'Erro ao atualizar unidade executante.' });
    }
  }

  async excluir(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const unidade = await prisma.unidadeSaude.findUnique({ where: { id } });
      if (!unidade) {
        return res.status(404).json({ message: 'Unidade não encontrada.' });
      }
      await prisma.unidadeSaude.update({
        where: { id },
        data: { executante: 0, solicitante: 0 }
      });
      return res.json({ message: 'Papéis da unidade removidos (não será mais exibida como executante nem solicitante até reativar).' });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        return res.status(404).json({ message: 'Unidade executante não encontrada.' });
      }
      return res.status(500).json({ message: error.message || 'Erro ao excluir unidade executante.' });
    }
  }
}
