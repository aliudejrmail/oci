import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { UnidadesExecutantesController } from '../controllers/unidadesExecutantes.controller';

const router = Router();
const controller = new UnidadesExecutantesController();

router.use(authenticate);

// Listar: qualquer usuário autenticado (para uso no Agendar e em listas)
router.get('/', (req, res) => controller.listar(req, res));

// Criar, atualizar e excluir: apenas ADMIN e GESTOR
router.post('/', requireRole('ADMIN', 'GESTOR'), (req, res) => controller.criar(req as any, res));
router.patch('/:id', requireRole('ADMIN', 'GESTOR'), (req, res) => controller.atualizar(req as any, res));
router.delete('/:id', requireRole('ADMIN', 'GESTOR'), (req, res) => controller.excluir(req as any, res));

export default router;
