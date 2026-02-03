import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { SigtapController } from '../controllers/sigtap.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/auth.middleware';
import { uploadSigtapZip } from '../middleware/uploadSigtapZip';

const router = Router();
const controller = new SigtapController();

router.use(authenticate);
router.use(requireRole('ADMIN'));

function handleMulterError(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Arquivo muito grande. Limite: 150 MB.' });
    }
    return res.status(400).json({ message: err.message || 'Erro no upload.' });
  }
  if (err) {
    return res.status(400).json({ message: err.message || 'Erro no upload.' });
  }
  return next();
}

router.post('/import', uploadSigtapZip, handleMulterError, (req: Request, res: Response) => controller.importar(req, res));

export default router;
