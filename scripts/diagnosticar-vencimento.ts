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

    const tipoOci = sol.oci.tipo;
    const dataFimValidadeApac = (tipoOci === 'ONCOLOGICO' && sol.dataInicioValidadeApac)
        ? dataLimiteRegistroOncologico(sol.dataInicioValidadeApac, sol.competenciaFimApac!)
        : (sol.competenciaFimApac ? dataFimCompetencia(sol.competenciaFimApac) : null);

    console.log('\n--- DADOS DA SOLICITAÇÃO ---');
    console.log(`ID: ${sol.id}`);
    console.log(`Protocolo: ${sol.numeroProtocolo}`);
    console.log(`Status: ${sol.status}`);
    console.log(`Data Solicitação: ${sol.dataSolicitacao}`);
    console.log(`Data Prazo: ${sol.dataPrazo}`);
    console.log(`Data Início Validade APAC: ${sol.dataInicioValidadeApac}`);
    console.log(`Competencia Fim APAC: ${sol.competenciaFimApac}`);
    console.log(`Data Fim Validade APAC (Calculado): ${dataFimValidadeApac}`);
    console.log(`Número Autorização APAC: ${sol.numeroAutorizacaoApac}`);

    console.log('\n--- PROCEDIMENTOS OBRIGATÓRIOS ---');
    const obrigatorios = sol.oci.procedimentos.filter(p => p.obrigatorio);
    obrigatorios.forEach(p => {
        const exec = sol.execucoes.find(e => e.procedimentoId === p.id);
        console.log(`- ${p.codigo}: ${p.nome} | Status: ${exec?.status || 'N/A'} | Data Exec: ${exec?.dataExecucao}`);
    });

    console.log('\n--- ALERTA ATUAL ---');
    console.log(JSON.stringify(sol.alerta, null, 2));

    await prisma.$disconnect();
}

check();
