import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const total = await prisma.solicitacaoOci.count();
    const ativas = await prisma.solicitacaoOci.count({
        where: { deletedAt: null }
    });
    const excluidas = await prisma.solicitacaoOci.count({
        where: { deletedAt: { not: null } }
    });

    console.log(`Total no Banco: ${total}`);
    console.log(`Ativas (deletedAt is null): ${ativas}`);
    console.log(`Excluídas (deletedAt is not null): ${excluidas}`);

    if (excluidas > 0) {
        console.log('\nExemplo de solicitações excluídas:');
        const logs = await prisma.solicitacaoOci.findMany({
            where: { deletedAt: { not: null } },
            select: { id: true, numeroProtocolo: true, deletedAt: true },
            take: 5
        });
        console.table(logs);
    }

    await prisma.$disconnect();
}

check();
