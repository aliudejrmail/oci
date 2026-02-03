import { Router } from 'express';
import { SolicitacoesController } from '../controllers/solicitacoes.controller';
import { SolicitacoesService } from '../services/solicitacoes.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { uploadAnexos } from '../middleware/uploadAnexos';
import { prisma } from '../database/prisma';

const router = Router();
const controller = new SolicitacoesController();

router.use(authenticate);

router.post('/', (req, res) => controller.criar(req as any, res));
router.get('/', (req, res) => controller.listar(req, res));
router.patch('/:id', requireRole('ADMIN', 'GESTOR'), (req, res) => controller.atualizar(req as any, res));
router.post(
  '/:id/anexos',
  (req, res, next) => {
    return uploadAnexos(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Erro no upload.' });
      }
      const validationError = (req as any).fileValidationError;
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      return next();
    });
  },
  (req, res) => controller.uploadAnexos(req, res)
);
// Rota de download deve vir ANTES da rota genérica /:id
router.get('/:id/anexos/:anexoId/download', (req, res) => controller.downloadAnexo(req, res));
router.delete('/:id/anexos/:anexoId', requireRole('ADMIN', 'GESTOR'), (req, res) => controller.removerAnexo(req as any, res));
router.patch('/:id/autorizacao-apac', (req, res) => controller.atualizarAutorizacaoApac(req as any, res));
router.get('/:id', (req, res) => controller.buscarPorId(req, res));
router.delete('/:id', requireRole('ADMIN'), (req, res) => controller.excluir(req as any, res));
router.patch('/:id/status', (req, res) => controller.atualizarStatus(req as any, res));
router.patch('/execucoes/:id', (req, res) => controller.atualizarExecucao(req, res));
router.post('/verificar-prazos', requireRole('ADMIN'), (req, res) => controller.verificarPrazos(req, res));
router.post('/corrigir-status-execucao', requireRole('ADMIN'), (req, res) => controller.corrigirStatusExecucao(req as any, res));
router.post('/:id/atualizar-alerta', requireRole('ADMIN'), async (req, res) => {
  try {
    const service = new SolicitacoesService(prisma);
    await service.atualizarAlertaPrazo(req.params.id);
    return res.json({ message: 'Alerta atualizado com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
