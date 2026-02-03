import { Request, Response } from 'express';
import { RelatoriosService } from '../services/relatorios.service';
import { prisma } from '../database/prisma';
import { StatusSolicitacao, TipoOci } from '@prisma/client';

const service = new RelatoriosService(prisma);

type FiltrosQuery = {
  dataInicio?: string;
  dataFim?: string;
  status?: string;
  unidadeId?: string;
  tipoOci?: string;
};

function parseFiltros(query: FiltrosQuery) {
  const filtros: Parameters<RelatoriosService['resumo']>[0] = {};
  if (query.dataInicio) filtros.dataInicio = query.dataInicio;
  if (query.dataFim) filtros.dataFim = query.dataFim;
  if (query.status && Object.values(StatusSolicitacao).includes(query.status as StatusSolicitacao)) {
    filtros.status = query.status as StatusSolicitacao;
  }
  if (query.unidadeId) filtros.unidadeId = query.unidadeId;
  if (query.tipoOci && Object.values(TipoOci).includes(query.tipoOci as TipoOci)) {
    filtros.tipoOci = query.tipoOci as TipoOci;
  }
  return filtros;
}

export class RelatoriosController {
  /** Lista opções de relatório disponíveis */
  async opcoes(_req: Request, res: Response) {
    try {
      const opcoes = service.opcoes();
      return res.json(opcoes);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao listar opções de relatório';
      return res.status(500).json({ message });
    }
  }

  /** Executa o relatório conforme tipo e filtros (query: tipo, dataInicio, dataFim, status, unidadeId, tipoOci) */
  async executar(req: Request, res: Response) {
    try {
      const { tipo } = req.query as { tipo?: string };
      if (!tipo) {
        return res.status(400).json({ message: 'Parâmetro "tipo" é obrigatório.' });
      }
      const filtros = parseFiltros(req.query as FiltrosQuery);

      switch (tipo) {
        case 'resumo': {
          const dados = await service.resumo(filtros);
          return res.json(dados);
        }
        case 'por-periodo': {
          const dados = await service.porPeriodo(filtros);
          return res.json(dados);
        }
        case 'por-status': {
          const dados = await service.porStatus(filtros);
          return res.json(dados);
        }
        case 'por-unidade-origem': {
          const dados = await service.porUnidadeOrigem(filtros);
          return res.json(dados);
        }
        case 'por-unidade-destino': {
          const dados = await service.porUnidadeDestino(filtros);
          return res.json(dados);
        }
        case 'por-tipo-oci': {
          const dados = await service.porTipoOci(filtros);
          return res.json(dados);
        }
        case 'procedimentos-executados': {
          const dados = await service.procedimentosExecutados(filtros);
          return res.json(dados);
        }
        case 'tempo-medio-conclusao': {
          const dados = await service.tempoMedioConclusao(filtros);
          return res.json(dados);
        }
        case 'evolucao-mensal': {
          const dados = await service.evolucaoMensal(filtros);
          return res.json(dados);
        }
        default:
          return res.status(400).json({ message: `Tipo de relatório inválido: ${tipo}` });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao gerar relatório';
      return res.status(500).json({ message });
    }
  }
}
