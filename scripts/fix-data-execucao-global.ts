
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando correção global de datas de execução (00:00:00Z -> 12:00:00Z)...');

    // 1. Identificar registros afetados (mesma query de detecção)
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
    console.log(`Encontrados ${lista.length} registros para correção.`);

    if (lista.length === 0) {
        console.log('Nenhum registro precisa de correção.');
        return;
    }

    // 2. Corrigir cada registro
    let corrigidos = 0;
    let erros = 0;

    for (const exec of lista) {
        try {
            const dataOriginal = new Date(exec.dataExecucao);
            // Adicionar 12 horas: dataOriginal está em 00:00 UTC.
            // UTC 12:00 é mais seguro para fusos como Brasil (GMT-3 -> 09:00, GMT-4 -> 08:00)
            const novaData = new Date(dataOriginal.getTime() + 12 * 60 * 60 * 1000);

            await prisma.execucaoProcedimento.update({
                where: { id: exec.id },
                data: { dataExecucao: novaData }
            });
            corrigidos++;

            if (corrigidos % 10 === 0) {
                process.stdout.write('.');
            }
        } catch (err: any) {
            console.error(`\nErro ao corrigir ID ${exec.id}: ${err.message}`);
            erros++;
        }
    }

    console.log(`\n\nResumo da operação:`);
    console.log(`- Encontrados: ${lista.length}`);
    console.log(`- Corrigidos: ${corrigidos}`);
    console.log(`- Erros: ${erros}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
