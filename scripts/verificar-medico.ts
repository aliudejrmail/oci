import { PrismaClient } from '@prisma/client';
import { SolicitacoesService } from '../src/services/solicitacoes.service';

const prisma = new PrismaClient();
const solicitacoesService = new SolicitacoesService(prisma);

async function check() {
    const result = await solicitacoesService.listarSolicitacoes({});
    const sol = result.solicitacoes[0];

    console.log('\n--- VERIFICAÇÃO DE MÉDICO SOLICITANTE ---');
    if (sol) {
        console.log(`Protocolo: ${sol.numeroProtocolo}`);
        if (sol.medicoSolicitante) {
            console.log(`Médico Solicitante: ${sol.medicoSolicitante.nome}`);
        } else {
            console.log('Médico Solicitante: NÃO INFORMADO (null na relação)');
            console.log('ID do Médico Gravado:', (sol as any).medicoSolicitanteId);
        }
    } else {
        console.log('Nenhuma solicitação encontrada.');
    }

    await prisma.$disconnect();
}

check();
