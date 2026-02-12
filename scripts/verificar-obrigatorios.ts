import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const sol = await prisma.solicitacaoOci.findFirst({
        where: { numeroProtocolo: 'OCI-20260207-00016' },
        include: {
            oci: {
                include: { procedimentos: true }
            },
            execucoes: {
                include: { procedimento: true }
            }
        }
    });

    if (!sol) {
        console.log('Nao encontrada');
        return;
    }

    const obrigatorios = sol.oci.procedimentos.filter(p => p.obrigatorio);
    console.log(`Obrigatorios: ${obrigatorios.length}`);
    obrigatorios.forEach(p => console.log(`- ${p.codigo} : ${p.nome}`));

    console.log('\nExecucoes:');
    sol.execucoes.forEach(e => {
        console.log(`- Proc: ${e.procedimento.codigo}, Status: ${e.status}, EhObrigatorio: ${e.procedimento.obrigatorio}`);
    });

    // Testar a logica
    const idsExecutados = new Set(sol.execucoes.filter(e => e.status === 'REALIZADO' || (e.status === 'AGUARDANDO_RESULTADO' && e.procedimento.nome.toLowerCase().includes('anatomo'))).map(e => e.procedimento.id));

    const faltam = obrigatorios.filter(p => !idsExecutados.has(p.id));
    console.log(`\nFaltam: ${faltam.length}`);
    faltam.forEach(p => console.log(`- FALTANDO: ${p.codigo} : ${p.nome}`));

    await prisma.$disconnect();
}

check();
