
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const protocolo = 'OCI-20260210-00003';
    console.log(`Buscando dados para: ${protocolo}`);

    const solicitacao = await prisma.solicitacaoOci.findUnique({
        where: { numeroProtocolo: protocolo },
        include: {
            execucoes: {
                include: {
                    procedimento: true
                }
            }
        }
    });

    if (!solicitacao) {
        console.log('Solicitação não encontrada.');
        return;
    }

    console.log('Solicitação encontrada.');
    console.log('ID:', solicitacao.id);
    console.log('Data da Solicitação:', solicitacao.dataSolicitacao);

    if (solicitacao.execucoes.length === 0) {
        console.log('Nenhuma execução encontrada.');
    }

    solicitacao.execucoes.forEach((exec, index) => {
        console.log(`\nExecução #${index + 1}:`);
        console.log('Procedimento:', exec.procedimento.nome);
        console.log('Status:', exec.status);
        console.log('Data Execução (objeto Date):', exec.dataExecucao);
        console.log('Data Execução (ISO):', exec.dataExecucao?.toISOString());
        console.log('Data Execução (Local):', exec.dataExecucao?.toLocaleString());

        if (exec.dataExecucao) {
            const utcHours = exec.dataExecucao.getUTCHours();
            console.log('Horas UTC:', utcHours);
        }
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
