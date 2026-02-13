import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { TipoOciController } from '../controllers/tiposOci.controller';

const router = Router();
const controller = new TipoOciController();

router.use(authenticate);

router.get('/', controller.index);
router.post('/', controller.store);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
