import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new DashboardController();

router.use(authenticate);

router.get('/estatisticas', (req, res) => controller.estatisticas(req, res));
router.get('/alertas', (req, res) => controller.alertas(req, res));
router.get('/alertas-resultado-biopsia', (req, res) => controller.alertasResultadoBiopsia(req, res));
router.get('/proximas-vencimento', (req, res) => controller.proximasVencimento(req, res));
router.get('/evolucao-temporal', (req, res) => controller.evolucaoTemporal(req, res));
router.get('/apacs-proximas-vencimento', (req, res) => controller.apacsProximasVencimento(req, res));
router.get('/proximas-prazo-registro-procedimentos', (req, res) => controller.proximasPrazoRegistroProcedimentos(req, res));
router.get('/notificacoes-autorizador', (req, res) => controller.notificacoesAutorizador(req, res));

export default router;
