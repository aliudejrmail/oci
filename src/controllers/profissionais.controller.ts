import { Request, Response } from 'express';
import { ProfissionaisService } from '../services/profissionais.service';
import { prisma } from '../database/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export class ProfissionaisController {
  private getService(): ProfissionaisService {
    return new ProfissionaisService(prisma);
  }

  async listar(req: Request, res: Response) {
    try {
      const service = this.getService();
      const { search, ativo, page, limit } = req.query;

      const resultado = await service.listarProfissionais({
        search: search as string,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      return res.json(resultado);
    } catch (error: any) {
      console.error('Erro ao listar profissionais:', error?.message, error?.code);
      const msg = error?.message || 'Erro ao listar profissionais';
      const isPrisma = error?.code && String(error.code).startsWith('P');
      return res.status(500).json({
        message: msg,
        ...(isPrisma && { code: error.code, hint: 'Verifique DATABASE_URL no .env e execute: npx prisma generate' })
      });
    }
  }

  async buscarPorId(req: Request, res: Response) {
    try {
      const service = this.getService();
      const { id } = req.params;
      const profissional = await service.buscarProfissionalPorId(id);

      if (!profissional) {
        return res.status(404).json({ message: 'Profissional não encontrado' });
      }

      return res.json(profissional);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async criar(req: AuthRequest, res: Response) {
    try {
      const service = this.getService();
      const { nome, cns, cbo } = req.body;

      if (!nome || !cns || !cbo) {
        return res.status(400).json({
          message: 'Todos os campos são obrigatórios: nome, CNS e CBO.'
        });
      }

      const profissional = await service.criarProfissional({
        nome,
        cns,
        cbo
      });

      return res.status(201).json(profissional);
    } catch (error: any) {
      console.error('Erro ao criar profissional:', error);
      return res.status(400).json({ message: error.message || 'Erro ao criar profissional.' });
    }
  }

  async atualizar(req: AuthRequest, res: Response) {
    try {
      const service = this.getService();
      const { id } = req.params;
      const { nome, cns, cbo, ativo } = req.body;

      const profissional = await service.atualizarProfissional(id, {
        nome,
        cns,
        cbo,
        ativo
      });

      return res.json(profissional);
    } catch (error: any) {
      console.error('Erro ao atualizar profissional:', error);
      return res.status(400).json({ message: error.message || 'Erro ao atualizar profissional.' });
    }
  }

  async excluir(req: AuthRequest, res: Response) {
    try {
      const service = this.getService();
      const { id } = req.params;
      const resultado = await service.excluirProfissional(id);
      return res.json(resultado);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
