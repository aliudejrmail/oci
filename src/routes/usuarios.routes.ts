import { Router } from 'express';
import { UsuariosController } from '../controllers/usuarios.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();
const controller = new UsuariosController();

router.use(authenticate);

// Listar executantes: ADMIN, GESTOR e EXECUTANTE (para seleção no Agendar/Reagendar)
router.get('/executantes', requireRole('ADMIN', 'GESTOR', 'EXECUTANTE'), (req, res) => controller.listarExecutantes(req as any, res));

router.use(requireRole('ADMIN', 'GESTOR'));

router.get('/', (req, res) => controller.listar(req as any, res));
router.get('/:id', (req, res) => controller.buscarPorId(req as any, res));
router.post('/', (req, res) => controller.criar(req as any, res));
router.patch('/:id', (req, res) => controller.atualizar(req as any, res));
router.delete('/:id', (req, res) => controller.excluir(req as any, res));

export default router;
