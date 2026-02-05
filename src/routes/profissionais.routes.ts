import { Router } from 'express';
import { ProfissionaisController } from '../controllers/profissionais.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();
const controller = new ProfissionaisController();

router.use(authenticate);

router.get('/cbos/listar', (req, res) => controller.listarCbos(req, res));
router.get('/', (req, res) => controller.listar(req, res));
router.get('/:id', (req, res) => controller.buscarPorId(req, res));
router.post('/', (req, res) => controller.criar(req as any, res));
router.patch('/:id', (req, res) => controller.atualizar(req as any, res));
router.delete('/:id', requireRole('ADMIN'), (req, res) => controller.excluir(req as any, res));

export default router;
