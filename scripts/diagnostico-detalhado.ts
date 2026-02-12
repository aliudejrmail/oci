import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const all = await prisma.solicitacaoOci.findMany({
        select: { id: true, status: true, deletedAt: true, numeroProtocolo: true }
    });

    console.log(`\n--- RELATÓRIO DE REGISTROS (Total: ${all.length}) ---`);

    const stats = all.reduce((acc, s) => {
        const isDeleted = s.deletedAt !== null;
        const deletedKey = isDeleted ? 'Excluído' : 'Ativo';
        const statusKey = s.status || 'SEM_STATUS';

        acc[deletedKey] = acc[deletedKey] || { total: 0, byStatus: {} };
        acc[deletedKey].total++;
        acc[deletedKey].byStatus[statusKey] = (acc[deletedKey].byStatus[statusKey] || 0) + 1;

        return acc;
    }, {} as any);

    console.log(JSON.stringify(stats, null, 2));

    const pendentes = all.filter(s => s.status === 'PENDENTE');
    console.log('\n--- DETALHE DAS SOLICITAÇÕES PENDENTES ---');
    console.table(pendentes);

    await prisma.$disconnect();
}

check();
