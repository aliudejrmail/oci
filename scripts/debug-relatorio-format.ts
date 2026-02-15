
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Buscando qualquer solicitação com unidadeOrigem ou unidadeOrigemId preenchido...');
    const result = await (prisma.solicitacaoOci as any).findFirst({
        where: {
            OR: [
                { unidadeOrigem: { not: null } },
                { unidadeOrigemId: { not: null } }
            ]
        }
    });

    if (result) {
        console.log('Registro encontrado:');
        console.log('unidadeOrigem:', result.unidadeOrigem);
        console.log('unidadeOrigemId:', result.unidadeOrigemId);
        console.log('unidadeDestino:', result.unidadeDestino);
        console.log('unidadeDestinoId:', result.unidadeDestinoId);
    } else {
        console.log('Nenhum registro com unidade preenchida encontrado.');
    }

    await prisma.$disconnect();
}

main();
