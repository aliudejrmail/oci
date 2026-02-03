import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../database/prisma';

const router = Router();

router.use(authenticate);

// Listar unidades de saúde (CNES)
router.get('/', async (req, res) => {
  try {
    const { search, ativo } = req.query;

    const where: any = {};
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (search) {
      const s = search as string;
      where.OR = [
        { nome: { contains: s, mode: 'insensitive' } },
        { cnes: { contains: s } }
      ];
    }

    const unidades = await prisma.unidadeSaude.findMany({
      where,
      orderBy: { nome: 'asc' }
    });

    return res.json(unidades);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;

