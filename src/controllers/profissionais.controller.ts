import { Request, Response } from 'express';
import { ProfissionaisService } from '../services/profissionais.service';
import { prisma } from '../database/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export class ProfissionaisController {
  private getService(): ProfissionaisService {
    return new ProfissionaisService(prisma);
  }

  async listarCbos(_req: Request, res: Response) {
    try {
      const service = this.getService();
      const cbos = await service.listarCbos();
      return res.json({ cbos });
    } catch (error: any) {
      console.error('Erro ao listar CBOs:', error?.message);
      return res.status(500).json({ message: error?.message || 'Erro ao listar CBOs' });
    }
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
      const { nome, cns, cboId, unidadesIds } = req.body;

      if (!nome || !cns || !cboId) {
        return res.status(400).json({
          message: 'Todos os campos são obrigatórios: nome, CNS e CBO.'
        });
      }

      // GESTOR: só pode vincular profissionais à sua própria unidade
      if (req.userTipo === 'GESTOR') {
        const usuarioGestor = await prisma.usuario.findUnique({
          where: { id: req.userId },
          select: { unidadeId: true }
        });

        if (!usuarioGestor?.unidadeId) {
          return res.status(400).json({
            message: 'Gestor não possui unidade vinculada. Configure a unidade do gestor para cadastrar vínculos de profissionais.'
          });
        }

        if (Array.isArray(unidadesIds) && unidadesIds.length > 0) {
          const unidadesInvalidas = unidadesIds.filter((id: string) => id !== usuarioGestor.unidadeId);
          if (unidadesInvalidas.length > 0) {
            return res.status(403).json({
              message: 'Gestor só pode vincular profissionais à sua própria unidade.'
            });
          }
        }
      }

      const profissional = await service.criarProfissional({
        nome,
        cns,
        cboId,
        unidadesIds
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
      const { nome, cns, cboId, ativo, unidadesIds } = req.body;

       // GESTOR: pode editar dados do profissional, mas não pode ativar/inativar nem alterar vínculos de outras unidades
       if (req.userTipo === 'GESTOR' && typeof ativo !== 'undefined') {
         return res.status(403).json({
           message: 'Gestor não tem permissão para ativar ou inativar profissionais.'
         });
       }

       // GESTOR: pode editar dados do profissional, mas só pode alterar vínculos da própria unidade
       if (req.userTipo === 'GESTOR' && Array.isArray(unidadesIds)) {
         const usuarioGestor = await prisma.usuario.findUnique({
           where: { id: req.userId },
           select: { unidadeId: true }
         });

         if (!usuarioGestor?.unidadeId) {
           return res.status(400).json({
             message: 'Gestor não possui unidade vinculada. Configure a unidade do gestor para alterar vínculos de profissionais.'
           });
         }

         // Buscar vínculos atuais do profissional
         const vinculosAtuais = await prisma.profissionalUnidade.findMany({
           where: { profissionalId: id },
           select: { unidadeId: true }
         });

         const atuaisIds = vinculosAtuais.map((v) => v.unidadeId);
         const novaListaIds: string[] = unidadesIds;
         const unidadeGestorId = usuarioGestor.unidadeId;

         // Unidades diferentes da unidade do gestor que já existiam
         const unidadesOutrasAtuais = atuaisIds.filter((uid) => uid !== unidadeGestorId);

         // Verificar remoção indevida: gestor não pode remover vínculos de outras unidades
         const removidasOutras = unidadesOutrasAtuais.filter((uid) => !novaListaIds.includes(uid));
         if (removidasOutras.length > 0) {
           return res.status(403).json({
             message: 'Gestor não pode desvincular profissionais de outras unidades. Só é permitido desvincular da própria unidade.'
           });
         }

         // Verificar adição indevida: gestor não pode adicionar vínculos de outras unidades
         const adicionadasOutras = novaListaIds.filter(
           (uid: string) => uid !== unidadeGestorId && !atuaisIds.includes(uid)
         );
         if (adicionadasOutras.length > 0) {
           return res.status(403).json({
             message: 'Gestor só pode adicionar vínculos de profissionais à sua própria unidade.'
           });
         }
       }

      const profissional = await service.atualizarProfissional(id, {
        nome,
        cns,
        cboId,
        ativo,
        unidadesIds
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
