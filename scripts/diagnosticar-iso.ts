import { PrismaClient } from '@prisma/client';
import { dataLimiteRegistroOncologico, dataFimCompetencia } from '../src/utils/date.utils';

const prisma = new PrismaClient();

async function check() {
    const sol = await prisma.solicitacaoOci.findFirst({
        where: { numeroProtocolo: 'OCI-20260209-00001' },
        include: {
            oci: {
                include: {
                    procedimentos: { orderBy: { ordem: 'asc' } }
                }
            },
            execucoes: {
                include: { procedimento: true }
            },
            alerta: true
        }
    });

    if (!sol) {
        console.log('Solicitação OCI-20260209-00001 não encontrada.');
        return;
    }

    console.log('\n--- DADOS DA SOLICITAÇÃO ---');
    console.log(`Protocolo: ${sol.numeroProtocolo}`);
    console.log(`Status: ${sol.status}`);
    console.log(`Data Solicitação: ${sol.dataSolicitacao.toISOString()}`);
    console.log(`Data Início Validade APAC: ${sol.dataInicioValidadeApac?.toISOString() || 'N/A'}`);
    console.log(`Competencia Fim APAC: ${sol.competenciaFimApac}`);

    console.log('\n--- PROCEDIMENTOS ---');
    sol.execucoes.forEach(e => {
        console.log(`- ${e.procedimento.codigo}: ${e.procedimento.nome}`);
        console.log(`  Status: ${e.status}`);
        console.log(`  Data Exec (ISO): ${e.dataExecucao?.toISOString() || 'N/A'}`);
    });

    const tipoOci = sol.oci.tipo;
    if (sol.dataInicioValidadeApac && sol.competenciaFimApac) {
        const dataFimValidadeApac = (tipoOci === 'ONCOLOGICO')
            ? dataLimiteRegistroOncologico(sol.dataInicioValidadeApac, sol.competenciaFimApac)
            : dataFimCompetencia(sol.competenciaFimApac);
        console.log(`\nData Fim Validade APAC (Calculado LOCAL): ${dataFimValidadeApac.toISOString()}`);
    }

    console.log('\n--- ALERTA ATUAL ---');
    console.log(JSON.stringify(sol.alerta, null, 2));

    await prisma.$disconnect();
}

check();
