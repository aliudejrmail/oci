
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verificando execuções com hora 00:00:00Z...');

    // Busca todas as execuções realizadas
    // Prisma retorna Date objects, então precisamos filtrar no JS ou usar raw query para ser mais preciso com o tempo
    // Vamos usar raw query para garantir que estamos pegando o que está no banco, independente do fuso da máquina

    const execucoes = await prisma.$queryRaw`
    SELECT id, "dataExecucao", "solicitacaoId"
    FROM "execucoes_procedimentos"
    WHERE status = 'REALIZADO'
    AND "dataExecucao" IS NOT NULL
    AND EXTRACT(HOUR FROM "dataExecucao") = 0
    AND EXTRACT(MINUTE FROM "dataExecucao") = 0
    AND EXTRACT(SECOND FROM "dataExecucao") = 0
  `;

    const lista = execucoes as any[];

    console.log(`Encontrados ${lista.length} registros com hora 00:00:00.`);

    if (lista.length > 0) {
        console.log('Exemplos (primeiros 5):');
        for (const exec of lista.slice(0, 5)) {
            const sol = await prisma.solicitacaoOci.findUnique({
                where: { id: exec.solicitacaoId },
                select: { numeroProtocolo: true }
            });
            console.log(`- ID: ${exec.id}, Data: ${exec.dataExecucao}, Protocolo: ${sol?.numeroProtocolo}`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
