import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { prisma } from '../database/prisma';

const service = new DashboardService(prisma);

export class DashboardController {
  async estatisticas(req: Request, res: Response) {
    try {
      const { dataInicio, dataFim } = req.query;

      const periodo = dataInicio && dataFim
        ? {
            inicio: new Date(dataInicio as string),
            fim: new Date(dataFim as string)
          }
        : undefined;

      const estatisticas = await service.obterEstatisticas(periodo);
      return res.json(estatisticas);
    } catch (error: any) {
      console.error('❌ Erro ao obter estatísticas:', error);
      console.error('Stack:', error.stack);
      return res.status(500).json({ 
        message: error.message || 'Erro ao obter estatísticas',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }

  async alertas(_req: Request, res: Response) {
    try {
      const alertas = await service.obterAlertasPrazos();
      return res.json(alertas || []);
    } catch (error: any) {
      console.error('Erro ao obter alertas:', error);
      return res.status(500).json({ 
        message: error.message || 'Erro ao obter alertas',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }

  async alertasResultadoBiopsia(_req: Request, res: Response) {
    try {
      const alertas = await service.obterAlertasResultadoBiopsiaPendente();
      return res.json(alertas || []);
    } catch (error: any) {
      console.error('Erro ao obter alertas de resultado biópsia:', error);
      return res.status(500).json({
        message: error.message || 'Erro ao obter alertas de resultado biópsia',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }

  async proximasVencimento(req: Request, res: Response) {
    try {
      const { limite } = req.query;
      const solicitacoes = await service.obterSolicitacoesProximasVencimento(
        limite ? parseInt(limite as string) : undefined
      );
      return res.json(solicitacoes);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async evolucaoTemporal(req: Request, res: Response) {
    try {
      const { dias } = req.query;
      const evolucao = await service.obterEvolucaoTemporal(
        dias ? parseInt(dias as string) : undefined
      );
      return res.json(evolucao || []);
    } catch (error: any) {
      console.error('❌ Erro ao obter evolução temporal:', error);
      return res.status(500).json({ 
        message: error.message || 'Erro ao obter evolução temporal',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }

  async apacsProximasVencimento(_req: Request, res: Response) {
    try {
      const apacs = await service.obterApacsProximasVencimento();
      return res.json(apacs || []);
    } catch (error: any) {
      console.error('❌ Erro ao obter APACs próximas do vencimento:', error);
      return res.status(500).json({ 
        message: error.message || 'Erro ao obter APACs próximas do vencimento',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }

  async notificacoesAutorizador(_req: Request, res: Response) {
    try {
      const notificacoes = await service.obterNotificacoesAutorizador();
      return res.json(notificacoes);
    } catch (error: any) {
      console.error('❌ Erro ao obter notificações Autorizador:', error);
      return res.status(500).json({
        message: error.message || 'Erro ao obter notificações',
        apacsPendentes: [],
        solicitacoesRecentes: [],
        totalApacsPendentes: 0,
        totalSolicitacoesRecentes: 0
      });
    }
  }

  async proximasPrazoRegistroProcedimentos(_req: Request, res: Response) {
    try {
      const solicitacoes = await service.obterSolicitacoesProximasPrazoRegistroProcedimentos();
      return res.json(solicitacoes || []);
    } catch (error: any) {
      console.error('❌ Erro ao obter solicitações próximas do prazo para registro de procedimentos:', error);
      return res.status(500).json({ 
        message: error.message || 'Erro ao obter solicitações próximas do prazo para registro de procedimentos',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }
}
