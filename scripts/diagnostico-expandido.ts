import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const all = await prisma.solicitacaoOci.findMany({
        select: { id: true, status: true, deletedAt: true, numeroProtocolo: true }
    });

    console.log(`\n--- RELATÓRIO COMPLETO (Total: ${all.length}) ---`);

    const statusCounts: Record<string, number> = {};
    const deletedStatusCounts: Record<string, number> = {};

    all.forEach(s => {
        const status = s.status || 'NULL';
        if (s.deletedAt === null) {
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        } else {
            deletedStatusCounts[status] = (deletedStatusCounts[status] || 0) + 1;
        }
    });

    console.log('ATIVAS (deletedAt is null):');
    console.log(statusCounts);
    console.log(`Total Ativas: ${Object.values(statusCounts).reduce((a: number, b: number) => a + b, 0)}`);

    console.log('\nEXCLUÍDAS (deletedAt is not null):');
    console.log(deletedStatusCounts);
    console.log(`Total Excluídas: ${Object.values(deletedStatusCounts).reduce((a: number, b: number) => a + b, 0)}`);

    console.log('\nPENDENTES NO BANCO:');
    const pendentes = all.filter(s => s.status === 'PENDENTE');
    pendentes.forEach(p => {
        console.log(`- ID: ${p.id}, Protocolo: ${p.numeroProtocolo}, DeletedAt: ${p.deletedAt}`);
    });

    await prisma.$disconnect();
}

check();
