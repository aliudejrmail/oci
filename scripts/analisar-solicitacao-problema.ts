import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyze() {
    const sol = await prisma.solicitacaoOci.findFirst({
        where: { numeroProtocolo: 'OCI-20260207-00016' },
        include: {
            oci: {
                include: {
                    procedimentos: {
                        where: { obrigatorio: true }
                    }
                }
            },
            execucoes: {
                include: {
                    procedimento: true
                }
            }
        }
    });

    if (!sol) {
        console.log('Solicitação não encontrada');
        return;
    }

    console.log('\n--- DADOS DA SOLICITAÇÃO ---');
    console.log(`ID: ${sol.id}`);
    console.log(`Protocolo: ${sol.numeroProtocolo}`);
    console.log(`Status: ${sol.status}`);
    console.log(`Data Início Validade APAC: ${sol.dataInicioValidadeApac}`);
    console.log(`Competência Fim APAC: ${sol.competenciaFimApac}`);
    console.log(`Deletada: ${sol.deletedAt}`);

    console.log('\n--- PROCEDIMENTOS OBRIGATÓRIOS NA OCI ---');
    console.table(sol.oci.procedimentos.map(p => ({
        id: p.id,
        codigo: p.codigo,
        nome: p.nome
    })));

    console.log('\n--- EXECUÇÕES REGISTRADAS ---');
    console.table(sol.execucoes.map(e => ({
        procedimento: e.procedimento.nome,
        status: e.status,
        dataExecucao: e.dataExecucao,
        obrigatorio: e.procedimento.obrigatorio
    })));

    await prisma.$disconnect();
}

analyze();
