import { Router } from 'express';
import { prisma } from '../database/prisma';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Listar OCIs
router.get('/', async (req, res) => {
  try {
    const { ativo, tipoId, search } = req.query;

    const where: any = {};
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (tipoId) where.tipoId = tipoId;
    if (search) {
      where.OR = [
        { nome: { contains: search as string, mode: 'insensitive' } },
        { codigo: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const ocis = await prisma.oci.findMany({
      where,
      include: {
        procedimentos: {
          orderBy: { ordem: 'asc' }
        },
        _count: {
          select: { solicitacoes: true }
        }
      },
      orderBy: { nome: 'asc' }
    });

    return res.json(ocis);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// Buscar OCI por ID (apenas procedimentos com código SIGTAP)
router.get('/:id', async (req, res) => {
  try {
    const oci = await prisma.oci.findUnique({
      where: { id: req.params.id },
      include: {
        procedimentos: {
          orderBy: { ordem: 'asc' }
        }
      }
    });

    if (!oci) {
      return res.status(404).json({ message: 'OCI não encontrada' });
    }

    return res.json(oci);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// Criar OCI
router.post('/', async (req, res) => {
  try {
    const { procedimentos, ...dadosOci } = req.body;

    const oci = await prisma.oci.create({
      data: {
        ...dadosOci,
        procedimentos: procedimentos
          ? {
            create: procedimentos
          }
          : undefined
      },
      include: {
        procedimentos: true,
        tipoOci: { select: { nome: true } } // Added to include tipoOci name
      }
    });

    return res.status(201).json(oci);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

// Atualizar OCI
router.put('/:id', async (req, res) => {
  try {
    const { procedimentos, ...dadosOci } = req.body;

    // Atualizar OCI
    await prisma.oci.update({
      where: { id: req.params.id },
      data: dadosOci
    });

    // Se houver procedimentos, atualizar em lugar (evitar deleteMany que viola FK com execucoes_procedimentos)
    if (procedimentos && Array.isArray(procedimentos)) {
      const existentes = await prisma.procedimentoOci.findMany({
        where: { ociId: req.params.id },
        select: { id: true, codigo: true, codigoSigtap: true }
      });
      const mapaPorCodigo = new Map(existentes.map((e) => [e.codigo, e]));

      for (let i = 0; i < procedimentos.length; i++) {
        const p = procedimentos[i] as any;
        const codigo = p.codigo || p.codigoSigtap;
        if (!codigo) continue;

        const existente = mapaPorCodigo.get(codigo);
        const dataProc = {
          nome: p.nome,
          descricao: p.descricao ?? null,
          tipo: p.tipo ?? 'EXAME',
          ordem: p.ordem ?? i + 1,
          obrigatorio: p.obrigatorio !== false
        };

        if (existente) {
          await prisma.procedimentoOci.update({
            where: { id: existente.id },
            data: dataProc
          });
        } else {
          await prisma.procedimentoOci.create({
            data: {
              ociId: req.params.id,
              codigo: String(codigo),
              codigoSigtap: p.codigoSigtap ?? codigo,
              ...dataProc
            }
          });
        }
      }

      // Remover apenas procedimentos que não estão no payload e não têm execuções
      const codigosPayload = new Set(procedimentos.map((p: any) => p.codigo || p.codigoSigtap).filter(Boolean));
      const paraRemover = existentes.filter((e) => !codigosPayload.has(e.codigo));
      for (const proc of paraRemover) {
        const count = await prisma.execucaoProcedimento.count({ where: { procedimentoId: proc.id } });
        if (count === 0) {
          await prisma.procedimentoOci.delete({ where: { id: proc.id } });
        }
      }
    }

    const ociAtualizada = await prisma.oci.findUnique({
      where: { id: req.params.id },
      include: {
        procedimentos: {
          orderBy: { ordem: 'asc' }
        }
      }
    });

    return res.json(ociAtualizada);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

export default router;
