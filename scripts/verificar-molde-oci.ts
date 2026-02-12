import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const sol = await prisma.solicitacaoOci.findFirst({
        where: { numeroProtocolo: 'OCI-20260209-00001' },
        select: { ociId: true }
    });

    if (!sol) {
        console.log('Solicitação OCI-20260209-00001 não encontrada.');
        return;
    }

    const oci = await prisma.oci.findUnique({
        where: { id: sol.ociId },
        include: {
            procedimentos: { orderBy: { ordem: 'asc' } }
        }
    });

    console.log(`\nOCI: ${oci?.nome} (${oci?.codigo})`);
    console.log('\n--- PROCEDIMENTOS DA OCI (MOLDE) ---');
    oci?.procedimentos.forEach(p => {
        console.log(`ID: ${p.id} | Código: ${p.codigo} | Nome: ${p.nome} | Obrigatório: ${p.obrigatorio}`);
    });

    const execs = await prisma.execucaoProcedimento.findMany({
        where: { solicitacaoId: 'bca4e194-1ae3-4f67-9f28-c629931dc5ab' },
        include: { procedimento: true }
    });

    console.log('\n--- EXECUÇÕES REAIS NA SOLICITAÇÃO ---');
    execs.forEach(e => {
        console.log(`ProcedimentoId: ${e.procedimentoId} | Nome: ${e.procedimento.nome} | Status: ${e.status}`);
    });

    await prisma.$disconnect();
}

check();
