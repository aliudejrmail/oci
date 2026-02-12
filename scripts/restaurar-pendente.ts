import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restore() {
    const result = await prisma.solicitacaoOci.updateMany({
        where: {
            status: 'PENDENTE',
            deletedAt: { not: null }
        },
        data: {
            deletedAt: null
        }
    });

    console.log(`\n--- RESTAURAÇÃO CONCLUÍDA ---`);
    console.log(`Registros restaurados: ${result.count}`);

    const check = await prisma.solicitacaoOci.count({
        where: { deletedAt: null }
    });
    console.log(`Total de solicitações ativas agora: ${check}`);

    await prisma.$disconnect();
}

restore();
