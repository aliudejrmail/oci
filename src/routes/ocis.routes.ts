import { Router } from 'express';
import { prisma } from '../database/prisma';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Listar OCIs
router.get('/', async (req, res) => {
  try {
    const { ativo, tipo, search } = req.query;

    const where: any = {};
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (tipo) where.tipo = tipo;
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
          where: { codigoSigtap: { not: null } },
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
          where: { codigoSigtap: { not: null } },
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
        procedimentos: true
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

    // Se houver procedimentos, atualizar
    if (procedimentos) {
      // Deletar procedimentos existentes
      await prisma.procedimentoOci.deleteMany({
        where: { ociId: req.params.id }
      });

      // Criar novos procedimentos
      if (procedimentos.length > 0) {
        await prisma.procedimentoOci.createMany({
          data: procedimentos.map((p: any) => ({
            ...p,
            ociId: req.params.id
          }))
        });
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
