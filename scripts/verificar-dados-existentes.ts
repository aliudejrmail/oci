
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Buscando execuções de procedimentos no banco...');

    const count = await prisma.execucaoProcedimento.count();
    console.log(`Total de execuções no banco: ${count}`);

    if (count > 0) {
        const execucoes = await prisma.execucaoProcedimento.findMany({
            take: 5,
            orderBy: { dataExecucao: 'desc' },
            select: { id: true, dataExecucao: true, status: true }
        });
        console.log('Últimas 5 execuções:', execucoes);
    } else {
        console.log('Nenhuma execução encontrada no banco.');
    }

    await prisma.$disconnect();
}

main();
