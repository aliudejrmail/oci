import { Router } from 'express';
import { RelatoriosController } from '../controllers/relatorios.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/auth.middleware';

const router = Router();
const controller = new RelatoriosController();

router.use(authenticate);
router.use(requireRole('ADMIN', 'GESTOR'));

router.get('/opcoes', (req, res) => controller.opcoes(req, res));
router.get('/', (req, res) => controller.executar(req, res));

export default router;
