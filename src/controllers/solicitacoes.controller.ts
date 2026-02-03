import { Request, Response } from 'express';
import { STATUS_EXECUCAO } from '../constants/status-execucao';
import path from 'path';
import fs from 'fs';
import { SolicitacoesService } from '../services/solicitacoes.service';
import { prisma } from '../database/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { validarNumeroAutorizacaoApac } from '../utils/validacao-apac.utils';

export class SolicitacoesController {
  private getService(): SolicitacoesService {
    return new SolicitacoesService(prisma);
  }

  async criar(req: AuthRequest, res: Response) {
    try {
      const service = this.getService();
      let unidadeOrigem = req.body.unidadeOrigem as string | undefined;
      // Usuário de unidade solicitante: só pode criar solicitações com sua unidade como origem (ADMIN pode escolher)
      if (req.userId && (req as AuthRequest).userTipo !== 'ADMIN') {
        const usuario = await prisma.usuario.findUnique({
          where: { id: req.userId },
          select: { unidadeId: true, unidade: { select: { cnes: true, nome: true, solicitante: true } } }
        });
        if (usuario?.unidadeId && usuario.unidade?.solicitante === 1) {
          unidadeOrigem = `${usuario.unidade.cnes} - ${usuario.unidade.nome}`;
        }
      }
      const solicitacao = await service.criarSolicitacao({
        ...req.body,
        unidadeOrigem: unidadeOrigem ?? req.body.unidadeOrigem,
        criadoPorId: req.userId!
      });
      res.status(201).json(solicitacao);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async listar(req: Request, res: Response) {
    try {
      const service = this.getService();
      const authReq = req as AuthRequest;
      const {
        status,
        tipo,
        pacienteId,
        ociId,
        dataInicio,
        dataFim,
        search,
        page,
        limit,
        unidadeExecutora
      } = req.query;

      // Usuário de unidade solicitante: só vê solicitações realizadas pela sua unidade (ADMIN vê todas)
      let unidadeOrigemFiltro: string | undefined;
      if (authReq.userId && authReq.userTipo !== 'EXECUTANTE' && authReq.userTipo !== 'ADMIN') {
        const usuario = await prisma.usuario.findUnique({
          where: { id: authReq.userId },
          select: { unidadeId: true, unidade: { select: { cnes: true, nome: true, solicitante: true } } }
        });
        if (usuario?.unidadeId && usuario.unidade?.solicitante === 1) {
          unidadeOrigemFiltro = `${usuario.unidade.cnes} - ${usuario.unidade.nome}`;
        }
      }

      const resultado = await service.listarSolicitacoes({
        status: status as any,
        tipo: tipo as any,
        pacienteId: pacienteId as string,
        ociId: ociId as string,
        dataInicio: dataInicio ? new Date(dataInicio as string) : undefined,
        dataFim: dataFim ? new Date(dataFim as string) : undefined,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        unidadeExecutora: (unidadeExecutora as string) || undefined,
        unidadeOrigem: unidadeOrigemFiltro,
        ...(authReq.userTipo === 'EXECUTANTE' && authReq.userId
          ? { executanteId: authReq.userId }
          : {})
      });

      return res.json(resultado);
    } catch (error: any) {
      console.error('❌ Erro ao listar solicitações:', error?.message, error?.code);
      const msg = error?.message || 'Erro ao listar solicitações';
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
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const solicitacao = await service.buscarSolicitacaoPorId(id);
      
      if (!solicitacao) {
        return res.status(404).json({ message: 'Solicitação não encontrada' });
      }

      // Executante só pode ver solicitações que tenham ao menos uma execução agendada para ele (por usuário ou por unidade)
      if (authReq.userTipo === 'EXECUTANTE' && authReq.userId) {
        const temPorExecutante = solicitacao.execucoes?.some(
          (e: any) => e.executanteId === authReq.userId
        );
        if (temPorExecutante) {
          return res.json(solicitacao);
        }
        // Agendamento por unidade (executanteId null): verificar se há execução AGENDADA na unidade do usuário
        const usuario = await prisma.usuario.findUnique({
          where: { id: authReq.userId },
          select: { unidadeExecutanteId: true, unidadeExecutante: { select: { cnes: true, nome: true } } }
        });
        if (usuario?.unidadeExecutanteId && usuario.unidadeExecutante) {
          const unidadeLabel = `${usuario.unidadeExecutante.cnes} - ${usuario.unidadeExecutante.nome}`;
          const temPorUnidade = solicitacao.execucoes?.some(
            (e: any) => e.status === STATUS_EXECUCAO.AGENDADO && e.unidadeExecutora === unidadeLabel
          );
          if (temPorUnidade) {
            return res.json(solicitacao);
          }
        }
        return res.status(404).json({ message: 'Solicitação não encontrada' });
      }

      // ADMIN, GESTOR e AUTORIZADOR podem ver qualquer solicitação
      const perfisComAcessoTotal = ['ADMIN', 'GESTOR', 'AUTORIZADOR']
      if (perfisComAcessoTotal.includes(authReq.userTipo || '')) {
        return res.json(solicitacao)
      }

      // Usuário de unidade solicitante: só pode ver solicitações realizadas pela sua unidade
      if (authReq.userId && authReq.userTipo !== 'EXECUTANTE') {
        const usuarioSolicitante = await prisma.usuario.findUnique({
          where: { id: authReq.userId },
          select: { unidadeId: true, unidade: { select: { cnes: true, nome: true, solicitante: true } } }
        });
        if (usuarioSolicitante?.unidadeId && usuarioSolicitante.unidade?.solicitante === 1) {
          const unidadeLabel = `${usuarioSolicitante.unidade.cnes} - ${usuarioSolicitante.unidade.nome}`;
          if ((solicitacao as any).unidadeOrigem !== unidadeLabel) {
            return res.status(404).json({ message: 'Solicitação não encontrada' });
          }
        }
      }

      return res.json(solicitacao);
    } catch (error: any) {
      console.error('[GET /solicitacoes/:id] Erro:', error?.message, error?.stack);
      return res.status(500).json({
        message: error?.message || 'Erro ao carregar solicitação',
        ...(process.env.NODE_ENV !== 'production' && error?.code && { code: error.code })
      });
    }
  }

  async atualizar(req: AuthRequest, res: Response) {
    try {
      const service = this.getService();
      const { id } = req.params;
      const { observacoes, unidadeOrigem, unidadeDestino, ociId } = req.body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'ID da solicitação é obrigatório' });
      }

      // Verificar se a solicitação existe
      const solicitacaoExistente = await service.buscarSolicitacaoPorId(id);
      if (!solicitacaoExistente) {
        return res.status(404).json({ message: 'Solicitação não encontrada' });
      }

      // Não permitir edição se estiver concluída ou cancelada
      if (solicitacaoExistente.status === 'CONCLUIDA' || solicitacaoExistente.status === 'CANCELADA') {
        return res.status(400).json({ 
          message: 'Não é possível editar uma solicitação concluída ou cancelada' 
        });
      }

      // Usuário de unidade solicitante: não pode alterar unidade de origem para outra (ADMIN pode)
      let unidadeOrigemFinal = unidadeOrigem;
      if (req.userId && req.userTipo !== 'ADMIN') {
        const usuarioEdit = await prisma.usuario.findUnique({
          where: { id: req.userId },
          select: { unidadeId: true, unidade: { select: { cnes: true, nome: true, solicitante: true } } }
        });
        if (usuarioEdit?.unidadeId && usuarioEdit.unidade?.solicitante === 1) {
          const labelUnidade = `${usuarioEdit.unidade.cnes} - ${usuarioEdit.unidade.nome}`;
          if (unidadeOrigem !== undefined && unidadeOrigem !== labelUnidade) {
            return res.status(403).json({
              message: 'Usuário de Unidade Solicitante não pode alterar a Unidade Solicitante da solicitação.'
            });
          }
          unidadeOrigemFinal = labelUnidade;
        }
      }

      const solicitacao = await service.atualizarSolicitacao(id, {
        observacoes,
        unidadeOrigem: unidadeOrigemFinal,
        unidadeDestino,
        ociId
      });

      return res.json(solicitacao);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async atualizarStatus(req: AuthRequest, res: Response) {
    try {
      const service = this.getService();
      const { id } = req.params;
      const { status, justificativaCancelamento } = req.body;

      const solicitacao = await service.atualizarStatus(id, status, req.userId!, justificativaCancelamento);
      res.json(solicitacao);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async atualizarExecucao(req: Request, res: Response) {
    try {
      const service = this.getService();
      const { id } = req.params;
      const execucao = await service.atualizarExecucaoProcedimento(id, req.body);
      res.json(execucao);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async corrigirStatusExecucao(_req: AuthRequest, res: Response) {
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "status_execucao" ("codigo", "descricao")
        VALUES ('REALIZADO', 'Realizado')
        ON CONFLICT ("codigo") DO NOTHING
      `)
      const updated = await prisma.$executeRawUnsafe(`
        UPDATE "execucoes_procedimentos" SET "status" = 'REALIZADO' WHERE "status" = 'EXECUTADO'
      `)
      await prisma.$executeRawUnsafe(`DELETE FROM "status_execucao" WHERE "codigo" = 'EXECUTADO'`)
      const statuses = await prisma.$queryRawUnsafe<{ codigo: string }[]>(
        `SELECT "codigo" FROM "status_execucao" ORDER BY "codigo"`
      )
      return res.json({
        message: 'Correção aplicada com sucesso',
        execucoesAtualizadas: updated,
        statusAtuais: statuses.map((s) => s.codigo)
      })
    } catch (error: any) {
      console.error('[corrigirStatusExecucao]', error?.message)
      return res.status(500).json({ message: error?.message || 'Erro ao corrigir status' })
    }
  }

  async verificarPrazos(_req: Request, res: Response) {
    try {
      const service = this.getService();
      const quantidade = await service.verificarPrazosVencidos();
      return res.json({ 
        message: `${quantidade} solicitação(ões) marcada(s) como vencida(s)`,
        quantidade 
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async uploadAnexos(req: Request, res: Response) {
    try {
      const { id: solicitacaoId } = req.params;
      const files = (req as Request & { files?: { originalname: string; path: string; mimetype?: string; size: number }[] }).files;
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
      }
      const solicitacao = await prisma.solicitacaoOci.findUnique({
        where: { id: solicitacaoId }
      });
      if (!solicitacao) {
        return res.status(404).json({ message: 'Solicitação não encontrada.' });
      }
      const created = await prisma.anexoSolicitacao.createMany({
        data: files.map((f) => ({
          solicitacaoOciId: solicitacaoId,
          nomeOriginal: f.originalname,
          caminhoArmazenado: path.relative(path.join(process.cwd(), 'uploads'), f.path),
          contentType: f.mimetype || 'application/pdf',
          tamanhoBytes: f.size
        }))
      });
      return res.status(201).json({
        message: `${created.count} anexo(s) salvo(s).`,
        count: created.count
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Erro ao salvar anexos.' });
    }
  }

  async excluir(req: AuthRequest, res: Response) {
    try {
      const service = this.getService();
      const { id } = req.params;
      const resultado = await service.excluirSolicitacao(id);
      return res.json(resultado);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async downloadAnexo(req: Request, res: Response) {
    try {
      const { id: solicitacaoId, anexoId } = req.params;
      
      // Verificar se a solicitação existe
      const solicitacao = await prisma.solicitacaoOci.findUnique({
        where: { id: solicitacaoId }
      });
      if (!solicitacao) {
        return res.status(404).json({ message: 'Solicitação não encontrada.' });
      }

      // Buscar anexo
      const anexo = await prisma.anexoSolicitacao.findUnique({
        where: { id: anexoId }
      });
      if (!anexo || anexo.solicitacaoOciId !== solicitacaoId) {
        return res.status(404).json({ message: 'Anexo não encontrado.' });
      }

      // Construir caminho completo do arquivo
      const caminhoCompleto = path.join(process.cwd(), 'uploads', anexo.caminhoArmazenado);
      
      // Verificar se arquivo existe
      if (!fs.existsSync(caminhoCompleto)) {
        return res.status(404).json({ message: 'Arquivo não encontrado no servidor.' });
      }

      // Enviar arquivo
      res.setHeader('Content-Type', anexo.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${anexo.nomeOriginal}"`);
      res.setHeader('Content-Length', anexo.tamanhoBytes);
      
      const fileStream = fs.createReadStream(caminhoCompleto);
      fileStream.pipe(res);
      
      // Não retornar nada após pipe, o Express gerencia a resposta
      return;
    } catch (error: any) {
      console.error('Erro ao fazer download do anexo:', error);
      return res.status(500).json({ message: error.message || 'Erro ao fazer download do anexo.' });
    }
  }

  /** Remove um anexo da solicitação. Apenas perfis ADMIN e GESTOR (rota já protegida). */
  async removerAnexo(req: AuthRequest, res: Response) {
    try {
      const { id: solicitacaoId, anexoId } = req.params;
      const solicitacao = await prisma.solicitacaoOci.findUnique({
        where: { id: solicitacaoId }
      });
      if (!solicitacao) {
        return res.status(404).json({ message: 'Solicitação não encontrada.' });
      }
      const anexo = await prisma.anexoSolicitacao.findUnique({
        where: { id: anexoId }
      });
      if (!anexo || anexo.solicitacaoOciId !== solicitacaoId) {
        return res.status(404).json({ message: 'Anexo não encontrado.' });
      }
      const caminhoCompleto = path.join(process.cwd(), 'uploads', anexo.caminhoArmazenado);
      if (fs.existsSync(caminhoCompleto)) {
        fs.unlinkSync(caminhoCompleto);
      }
      await prisma.anexoSolicitacao.delete({ where: { id: anexoId } });
      return res.json({ message: 'Anexo removido com sucesso.' });
    } catch (error: any) {
      console.error('Erro ao remover anexo:', error);
      return res.status(500).json({ message: error.message || 'Erro ao remover anexo.' });
    }
  }

  async atualizarAutorizacaoApac(req: AuthRequest, res: Response) {
    try {
      const service = this.getService();
      const { id } = req.params;
      const {
        numeroAutorizacaoApac,
        nomeProfissionalAutorizador,
        cnsProfissionalAutorizador,
        dataAutorizacaoApac,
        motivoSaida,
        dataDiagnosticoCitoHistopatologico,
        cidPrincipal,
        cidSecundario
      } = req.body;

      // Validações
      if (!numeroAutorizacaoApac || !nomeProfissionalAutorizador || !cnsProfissionalAutorizador || !dataAutorizacaoApac) {
        return res.status(400).json({ 
          message: 'Todos os campos são obrigatórios: número da autorização, nome do profissional, CNS e data da autorização.' 
        });
      }

      // Validar formato do número de autorização APAC
      const validacaoApac = validarNumeroAutorizacaoApac(numeroAutorizacaoApac);
      if (!validacaoApac.valido) {
        return res.status(400).json({ 
          message: validacaoApac.erro || 'Número de autorização APAC inválido.' 
        });
      }

      // Validar formato do CNS (15 dígitos)
      const cnsLimpo = cnsProfissionalAutorizador.replace(/\D/g, '');
      if (cnsLimpo.length !== 15) {
        return res.status(400).json({ 
          message: 'O CNS deve conter exatamente 15 dígitos.' 
        });
      }

      // Remover formatação do número de autorização APAC antes de salvar
      const numeroApacLimpo = numeroAutorizacaoApac.replace(/\D/g, '');

      const solicitacao = await service.atualizarAutorizacaoApac(id, {
        numeroAutorizacaoApac: numeroApacLimpo,
        nomeProfissionalAutorizador: nomeProfissionalAutorizador.trim(),
        cnsProfissionalAutorizador: cnsLimpo,
        dataAutorizacaoApac: new Date(dataAutorizacaoApac),
        motivoSaida: motivoSaida || undefined,
        dataDiagnosticoCitoHistopatologico: dataDiagnosticoCitoHistopatologico 
          ? new Date(dataDiagnosticoCitoHistopatologico) 
          : undefined,
        cidPrincipal: cidPrincipal || undefined,
        cidSecundario: cidSecundario || undefined
      });

      return res.json(solicitacao);
    } catch (error: any) {
      console.error('Erro ao atualizar autorização APAC:', error);
      return res.status(400).json({ message: error.message || 'Erro ao atualizar autorização APAC.' });
    }
  }
}
