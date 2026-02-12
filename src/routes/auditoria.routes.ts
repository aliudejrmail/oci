import { Router } from 'express';
import { AuditoriaController } from '../controllers/auditoria.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuditoriaController();

// Apenas ADMIN pode acessar logs de auditoria
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/', controller.listar);
router.get('/acoes', controller.obterAcoesDisponiveis);
router.get('/entidades', controller.obterEntidadesDisponiveis);

export default router;
