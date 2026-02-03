import { Request, Response, Router } from 'express';
import { UsuariosController } from '../controllers/usuarios.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();
const controller = new UsuariosController();

router.use(authenticate);

// Listar executantes: ADMIN, GESTOR e EXECUTANTE (para seleção no Agendar/Reagendar)
router.get('/executantes', requireRole('ADMIN', 'GESTOR', 'EXECUTANTE'), (req: Request, res: Response) => controller.listarExecutantes(req as any, res));

router.use(requireRole('ADMIN', 'GESTOR'));

router.get('/', (req: Request, res: Response) => controller.listar(req as any, res));
router.get('/:id', (req: Request, res: Response) => controller.buscarPorId(req as any, res));
router.post('/', (req: Request, res: Response) => controller.criar(req as any, res));
router.patch('/:id', (req: Request, res: Response) => controller.atualizar(req as any, res));
router.delete('/:id', (req: Request, res: Response) => controller.excluir(req as any, res));

export default router;
