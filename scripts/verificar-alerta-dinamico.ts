import { PrismaClient } from '@prisma/client';
import { SolicitacoesService } from '../src/services/solicitacoes.service';

const prisma = new PrismaClient();
const solicitacoesService = new SolicitacoesService(prisma);

async function check() {
    const result = await solicitacoesService.buscarSolicitacaoPorId('bca4e194-1ae3-4f67-9f28-c629931dc5ab');

    console.log('\n--- VERIFICAÇÃO DE ALERTA DINÂMICO ---');
    if (result) {
        console.log(`Protocolo: ${result.numeroProtocolo}`);
        if (result.alerta) {
            console.log(`Dias Restantes: ${result.alerta.diasRestantes}`);
            console.log(`Tipo Prazo: ${(result.alerta as any).tipoPrazo}`);
        } else {
            console.log('Alerta: NÃO ENCONTRADO');
        }
    } else {
        console.log('Solicitação bca4e194-1ae3-4f67-9f28-c629931dc5ab não encontrada.');
    }

    await prisma.$disconnect();
}

check();
