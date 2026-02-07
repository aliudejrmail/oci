import { prisma } from '../src/database/prisma';

async function atualizarUnidadeExecutora() {
  // IDs e códigos de exemplo
  const solicitacaoId = 'OCI-20260207-00017';
  const codigoProcedimento = '0301010072'; // CONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA
  const unidadeExecutoraId = 'COLOQUE_AQUI_O_ID_DA_UNIDADE'; // Substitua pelo ID correto

  // Busca o procedimento
  const procedimento = await prisma.procedimentoOci.findFirst({
    where: { codigo: codigoProcedimento }
  });
  if (!procedimento) {
    console.log('Procedimento não encontrado.');
    return;
  }

  // Atualiza a execução do procedimento
  const result = await prisma.execucaoProcedimento.updateMany({
    where: {
      solicitacaoId,
      procedimentoId: procedimento.id
    },
    data: {
      unidadeExecutoraId,
    }
  });

  if (result.count > 0) {
    console.log(`Unidade executora atualizada para ${unidadeExecutoraId} em ${result.count} registro(s).`);
  } else {
    console.log('Nenhum registro de execução encontrado para atualizar.');
  }

  await prisma.$disconnect();
}

if (require.main === module) {
  atualizarUnidadeExecutora();
}
