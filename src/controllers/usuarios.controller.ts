import { Response } from 'express';
import { UsuariosService } from '../services/usuarios.service';
import { prisma } from '../database/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const service = new UsuariosService(prisma);

export class UsuariosController {
  /** Lista apenas usuários com perfil EXECUTANTE (ativo). Usado no Agendar para escolher o executante. */
  async listarExecutantes(_req: AuthRequest, res: Response) {
    try {
      const usuarios = await prisma.usuario.findMany({
        where: { tipo: 'EXECUTANTE', ativo: true },
        select: { id: true, nome: true, email: true },
        orderBy: { nome: 'asc' }
      });
      return res.json(usuarios);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Erro ao listar executantes.' });
    }
  }

  async listar(req: AuthRequest, res: Response) {
    try {
      const { search, tipo, ativo, page, limit } = req.query;
      const resultado = await service.listarUsuarios({
        search: search as string,
        tipo: tipo as string,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });
      return res.json(resultado);
    } catch (error: any) {
      console.error('Erro ao listar usuários:', error?.message, error?.code);
      const msg = error?.message || 'Erro ao listar usuários';
      const isPrisma = error?.code && String(error.code).startsWith('P');
      return res.status(500).json({
        message: msg,
        ...(isPrisma && { code: error.code, hint: 'Verifique DATABASE_URL no .env e execute: npx prisma generate' })
      });
    }
  }

  async buscarPorId(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const usuario = await service.buscarPorId(id);
      return res.json(usuario);
    } catch (error: any) {
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || 'Erro ao buscar usuário' });
    }
  }

  async criar(req: AuthRequest, res: Response) {
    try {
      const { nome, email, senha, tipo, unidadeId, unidadeExecutanteId } = req.body;

      if (req.userTipo === 'GESTOR' && tipo === 'ADMIN') {
        return res.status(403).json({ message: 'Gestor não tem permissão para criar usuários com perfil Administrador.' });
      }

      if (!nome?.trim() || !email?.trim() || !senha?.trim() || !tipo?.trim()) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios: nome, email, senha, tipo' });
      }

      if (senha.length < 6) {
        return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres' });
      }

      const usuario = await service.criar({ nome, email, senha, tipo, unidadeId: unidadeId || null, unidadeExecutanteId: unidadeExecutanteId || null });
      return res.status(201).json(usuario);
    } catch (error: any) {
      if (error.message?.includes('e-mail')) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message?.includes('Tipo inválido')) {
        return res.status(400).json({ message: error.message });
      }
      console.error('Erro ao criar usuário:', error);
      return res.status(500).json({ message: error.message || 'Erro ao criar usuário' });
    }
  }

  async atualizar(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { nome, email, senha, tipo, ativo, unidadeId, unidadeExecutanteId } = req.body;

      if (req.userTipo === 'GESTOR') {
        const existente = await service.buscarPorId(id);
        if (existente.tipo === 'ADMIN') {
          return res.status(403).json({ message: 'Gestor não tem permissão para editar usuários com perfil Administrador.' });
        }
        if (tipo === 'ADMIN') {
          return res.status(403).json({ message: 'Gestor não tem permissão para atribuir perfil Administrador.' });
        }
      }

      if (senha !== undefined && senha !== '' && senha.length < 6) {
        return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres' });
      }

      const usuario = await service.atualizar(id, {
        nome,
        email,
        senha: senha || undefined,
        tipo,
        ativo,
        unidadeId: unidadeId !== undefined ? (unidadeId || null) : undefined,
        unidadeExecutanteId: unidadeExecutanteId !== undefined ? (unidadeExecutanteId || null) : undefined
      });
      return res.json(usuario);
    } catch (error: any) {
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message?.includes('e-mail') || error.message?.includes('Tipo inválido')) {
        return res.status(400).json({ message: error.message });
      }
      console.error('Erro ao atualizar usuário:', error);
      return res.status(500).json({ message: error.message || 'Erro ao atualizar usuário' });
    }
  }

  async excluir(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (req.userId === id) {
        return res.status(400).json({ message: 'Não é possível excluir o próprio usuário' });
      }

      if (req.userTipo === 'GESTOR') {
        const existente = await service.buscarPorId(id);
        if (existente.tipo === 'ADMIN') {
          return res.status(403).json({ message: 'Gestor não tem permissão para excluir usuários com perfil Administrador.' });
        }
      }

      await service.excluir(id);
      return res.json({ message: 'Usuário excluído com sucesso' });
    } catch (error: any) {
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ message: error.message });
      }
      console.error('Erro ao excluir usuário:', error);
      return res.status(500).json({ message: error.message || 'Erro ao excluir usuário' });
    }
  }
}
