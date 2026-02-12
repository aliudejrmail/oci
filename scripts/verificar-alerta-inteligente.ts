import { PrismaClient } from '@prisma/client';
import { DashboardService } from '../src/services/dashboard.service';

const prisma = new PrismaClient();
const dashboardService = new DashboardService(prisma);

async function check() {
    const alertas = await dashboardService.obterAlertasPrazos();
    const alertaAlvo = alertas.find((a: any) => a.solicitacao.numeroProtocolo === 'OCI-20260207-00016');

    if (!alertaAlvo) {
        console.log('Alerta nao encontrado (pode ter sido resolvido ou data fora do range)');
        return;
    }

    console.log('\n--- VERIFICAÇÃO DE ALERTA INTELIGENTE ---');
    console.log(`Protocolo: ${alertaAlvo.solicitacao.numeroProtocolo}`);
    console.log(`Tipo de Prazo (Label): ${alertaAlvo.tipoPrazo}`);
    console.log(`Dias Restantes: ${alertaAlvo.diasRestantes}`);

    await prisma.$disconnect();
}

check();
