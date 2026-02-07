/**
 * Script para adicionar o procedimento "CONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA - RETORNO" à OCI de oncologia.
 * Este procedimento não existe no SIGTAP, mas é fundamental para o fluxo.
 */

import { prisma } from '../src/database/prisma';

async function adicionarConsultaRetorno() {
  try {
    const oci = await prisma.oci.findFirst({
      where: { codigo: '0906010012' }
    });

    if (!oci) {
      console.log('❌ OCI 090101 não encontrada.');
      return;
    }

    const codigoProcedimento = 'OCI-RETORNO-01';
    const nomeProcedimento = 'CONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA - RETORNO';

    const existente = await prisma.procedimentoOci.findFirst({
      where: {
        ociId: oci.id,
        nome: nomeProcedimento
      }
    });

    if (existente) {
      console.log('✅ Procedimento de retorno já existe na OCI.');
      return;
    }

    await prisma.procedimentoOci.create({
      data: {
        ociId: oci.id,
        codigo: codigoProcedimento,
        codigoSigtap: null, // Não existe no SIGTAP
        nome: nomeProcedimento,
        tipo: 'CONSULTA',
        ordem: 99, // Ordem alta para aparecer após a consulta principal
        obrigatorio: false
      }
    });

    console.log('✅ Procedimento de retorno adicionado à OCI!');
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  adicionarConsultaRetorno();
}
