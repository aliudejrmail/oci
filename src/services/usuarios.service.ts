import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuditoriaService } from './auditoria.service';

const TIPOS_PERMITIDOS = ['ADMIN', 'GESTOR', 'ATENDENTE', 'EXECUTANTE', 'AUTORIZADOR', 'SOLICITANTE'];

export class UsuariosService {
  private auditoria: AuditoriaService;

  constructor(private prisma: PrismaClient) {
    this.auditoria = new AuditoriaService(prisma);
  }

  async listarUsuarios(filtros: {
    search?: string;
    tipo?: string;
    ativo?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filtros.page || 1;
    const limit = Math.min(filtros.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filtros.tipo) {
      where.tipo = filtros.tipo;
    }

    if (filtros.ativo !== undefined) {
      where.ativo = filtros.ativo;
    }

    if (filtros.search) {
      where.OR = [
        { nome: { contains: filtros.search, mode: 'insensitive' } },
        { email: { contains: filtros.search, mode: 'insensitive' } }
      ];
    }

    const [usuarios, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          ativo: true,
          unidadeId: true,
          unidade: { select: { id: true, cnes: true, nome: true } },
          unidadeExecutanteId: true,
          unidadeExecutante: { select: { id: true, cnes: true, nome: true } },
          tentativasLogin: true,
          bloqueadoEm: true,
          ultimoAcesso: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { nome: 'asc' },
        skip,
        take: limit
      }),
      this.prisma.usuario.count({ where })
    ]);

    return {
      usuarios,
      paginacao: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async buscarPorId(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        unidadeId: true,
        unidade: { select: { id: true, cnes: true, nome: true } },
        unidadeExecutanteId: true,
        unidadeExecutante: { select: { id: true, cnes: true, nome: true } },
        tentativasLogin: true,
        bloqueadoEm: true,
        ultimoAcesso: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    return usuario;
  }

  async criar(data: {
    nome: string;
    email: string;
    senha: string;
    tipo: string;
    unidadeId?: string | null;
    unidadeExecutanteId?: string | null;
  }) {
    if (!TIPOS_PERMITIDOS.includes(data.tipo)) {
      throw new Error(`Tipo inválido. Permitidos: ${TIPOS_PERMITIDOS.join(', ')}`);
    }

    const emailNormalizado = data.email.trim().toLowerCase();
    const existente = await this.prisma.usuario.findUnique({
      where: { email: emailNormalizado }
    });

    if (existente) {
      throw new Error('Já existe um usuário cadastrado com este e-mail.');
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);

    const createData: any = {
      nome: data.nome.trim(),
      email: emailNormalizado,
      senha: senhaHash,
      tipo: data.tipo
    };
    if (data.unidadeId?.trim()) {
      createData.unidadeId = data.unidadeId.trim();
    }
    if (data.tipo === 'EXECUTANTE' && data.unidadeExecutanteId?.trim()) {
      createData.unidadeExecutanteId = data.unidadeExecutanteId.trim();
    }

    const usuario = await this.prisma.usuario.create({
      data: createData,
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        unidadeId: true,
        unidade: { select: { id: true, cnes: true, nome: true } },
        unidadeExecutanteId: true,
        unidadeExecutante: { select: { id: true, cnes: true, nome: true } },
        tentativasLogin: true,
        bloqueadoEm: true,
        ultimoAcesso: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Audit: CRIACAO_USUARIO
    await this.auditoria.log({
      acao: 'CRIACAO_USUARIO',
      entidade: 'Usuario',
      entidadeId: usuario.id,
      detalhes: JSON.stringify({ nome: usuario.nome, email: usuario.email, tipo: usuario.tipo })
    });

    return usuario;
  }

  async atualizar(id: string, data: {
    nome?: string;
    email?: string;
    senha?: string;
    tipo?: string;
    ativo?: boolean;
    unidadeId?: string | null;
    unidadeExecutanteId?: string | null;
  }) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id }
    });

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    if (data.tipo && !TIPOS_PERMITIDOS.includes(data.tipo)) {
      throw new Error(`Tipo inválido. Permitidos: ${TIPOS_PERMITIDOS.join(', ')}`);
    }

    const updateData: any = {};

    if (data.nome !== undefined) {
      updateData.nome = data.nome.trim();
    }

    if (data.email !== undefined) {
      const emailNormalizado = data.email.trim().toLowerCase();
      const existente = await this.prisma.usuario.findUnique({
        where: { email: emailNormalizado }
      });
      if (existente && existente.id !== id) {
        throw new Error('Já existe outro usuário cadastrado com este e-mail.');
      }
      updateData.email = emailNormalizado;
    }

    if (data.senha !== undefined && data.senha.trim()) {
      updateData.senha = await bcrypt.hash(data.senha, 10);
    }

    if (data.tipo !== undefined) {
      updateData.tipo = data.tipo;
    }

    if (data.ativo !== undefined) {
      updateData.ativo = data.ativo;
    }

    if (data.unidadeId !== undefined) {
      updateData.unidadeId = data.unidadeId?.trim() || null;
    }
    if (data.unidadeExecutanteId !== undefined) {
      updateData.unidadeExecutanteId = data.unidadeExecutanteId?.trim() || null;
    }

    const usuarioFinal = await this.prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        unidadeId: true,
        unidade: { select: { id: true, cnes: true, nome: true } },
        unidadeExecutanteId: true,
        unidadeExecutante: { select: { id: true, cnes: true, nome: true } },
        tentativasLogin: true,
        bloqueadoEm: true,
        ultimoAcesso: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Audit: ATUALIZACAO_USUARIO
    await this.auditoria.log({
      acao: 'ATUALIZACAO_USUARIO',
      entidade: 'Usuario',
      entidadeId: id,
      detalhes: JSON.stringify({ camposAlterados: Object.keys(updateData) })
    });

    return usuarioFinal;
  }

  async excluir(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id }
    });

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    await this.prisma.usuario.delete({
      where: { id }
    });

    // Audit: EXCLUSAO_USUARIO
    await this.auditoria.log({
      acao: 'EXCLUSAO_USUARIO',
      entidade: 'Usuario',
      entidadeId: id,
      detalhes: JSON.stringify({ nome: usuario.nome, email: usuario.email })
    });

    return { message: 'Usuário excluído com sucesso' };
  }
}
