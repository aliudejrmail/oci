
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.execucaoProcedimento.count({
        where: { status: 'REALIZADO' }
    });
    console.log(`Total de execuções REALIZADO: ${count}`);

    if (count > 0) {
        const ex = await prisma.execucaoProcedimento.findFirst({
            where: { status: 'REALIZADO' },
            include: { unidadeExecutoraRef: true }
        });
        console.log('Exemplo REALIZADO:', ex);
    }
}

main();
